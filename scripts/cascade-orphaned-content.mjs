#!/usr/bin/env node
/**
 * One-off cleanup: hide content whose teacher has already been deleted or suspended.
 *
 * The remove/suspend flows now cascade automatically (lib/data/teacherCascade.ts), but
 * content orphaned BEFORE that existed is still live. This applies the same rule
 * retroactively, with the same markers, so it is equally reversible.
 *
 *   node scripts/cascade-orphaned-content.mjs                    # dry run (shows the plan)
 *   node scripts/cascade-orphaned-content.mjs --apply            # actually write
 *   node scripts/cascade-orphaned-content.mjs --skip=id1,id2     # never touch these
 *
 * --skip exists so paid content can be spared: hiding an item revokes access for
 * students who bought it, so anything with a live purchase should be skipped
 * deliberately rather than swept up.
 *
 * Needs GCLOUD_PROJECT (or ADC for the target project).
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
const SKIP = new Set(
    (process.argv.find((a) => a.startsWith('--skip=')) ?? '')
        .replace('--skip=', '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
);
const projectId = process.env.GCLOUD_PROJECT ?? 'ljeducare';

initializeApp({ projectId });
const db = getFirestore();

const COLLECTIONS = ['classes', 'courses', 'quizzes'];

/** staffId -> { deleted, name } ; plus the linked user's status. */
async function loadTeacherState() {
    const state = new Map();
    const staff = await db.collection('staff').get();
    for (const d of staff.docs) {
        const s = d.data() || {};
        let userStatus = null;
        if (s.userId) {
            const u = await db.collection('users').doc(String(s.userId)).get();
            userStatus = u.exists ? (u.data() || {}).status ?? null : 'missing';
        }
        state.set(d.id, { deleted: s.isDeleted === true, name: s.name || d.id, userStatus });
    }
    return state;
}

const isGone = (t) => !t || t.deleted || t.userStatus === 'suspended' || t.userStatus === 'missing';

const teachers = await loadTeacherState();
const plan = [];

for (const col of COLLECTIONS) {
    const snap = await db.collection(col).get();
    for (const d of snap.docs) {
        const x = d.data() || {};
        if (x.isDeleted === true) continue; // already hidden
        if (SKIP.has(d.id)) {
            console.log(`  SKIP     ${d.id}  ${String(x.title || '').slice(0, 34)}  (explicitly spared)`);
            continue;
        }
        const t = teachers.get(String(x.teacherId));
        if (!x.teacherId) {
            plan.push({ col, id: d.id, title: x.title || '', why: 'no teacherId' });
            continue;
        }
        if (isGone(t)) {
            const why = !t ? 'teacher record missing' : t.deleted ? `teacher deleted (${t.name})` : `teacher ${t.userStatus} (${t.name})`;
            plan.push({ col, id: d.id, title: x.title || '', why, staffId: String(x.teacherId) });
        }
    }
}

console.log(`Project: ${projectId}   Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
if (!plan.length) {
    console.log('Nothing to do — no live content belongs to a removed/suspended teacher.');
    process.exit(0);
}
console.log(`\nWould hide ${plan.length} item(s):`);
for (const p of plan) {
    console.log(`  ${p.col.padEnd(8)} ${p.id.slice(0, 30).padEnd(32)} ${String(p.title).slice(0, 34).padEnd(36)} ${p.why}`);
}

if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write these changes.');
    process.exit(0);
}

const stamp = new Date().toISOString();
let done = 0;
for (let i = 0; i < plan.length; i += 400) {
    const batch = db.batch();
    for (const p of plan.slice(i, i + 400)) {
        batch.update(db.collection(p.col).doc(p.id), {
            isDeleted: true,
            isPublished: false,
            // Same markers the live cascade uses, so restore works identically.
            ...(p.staffId ? { cascadedFromTeacher: p.staffId } : {}),
            cascadedReason: 'orphaned-backfill',
            cascadedAt: stamp,
            cascadedBy: 'script:cascade-orphaned-content',
        });
        done++;
    }
    await batch.commit();
}
console.log(`\nHidden ${done} item(s). Reversible: clear isDeleted / use restoreTeacherContent for a given teacher.`);
