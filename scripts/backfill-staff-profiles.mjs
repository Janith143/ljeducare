#!/usr/bin/env node
/**
 * One-off: give every teaching-role account a `staff` profile.
 *
 * Managers and teacher admins can be assigned as the teacher of a class or course and
 * earn commission on it, but only 'teacher' and 'teacher_admin' ever got a staff profile
 * created — managers were skipped in both createStaffAction and updateUserAccessAction.
 * Without a profile they never appear under Staff and have nowhere to hold a commission
 * rate or earnings. Both code paths are fixed; this repairs the accounts already created.
 *
 * New profiles start at 0% commission on purpose: a rate is a payout promise, so it is
 * set deliberately in Admin → Staff rather than guessed here.
 *
 *   node scripts/backfill-staff-profiles.mjs                  # dry run
 *   node scripts/backfill-staff-profiles.mjs --apply
 *   node scripts/backfill-staff-profiles.mjs --apply --include-demo
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
const INCLUDE_DEMO = process.argv.includes('--include-demo');
const projectId = process.env.GCLOUD_PROJECT ?? 'ljeducare';
initializeApp({ projectId });
const db = getFirestore();

/** Mirrors TEACHING_ROLES in shared/permissions/roles.ts. */
const TEACHING_ROLES = ['teacher', 'teacher_admin', 'manager'];

const slug = (name) => {
    const base = String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${base || 'teacher'}-${Math.random().toString(36).slice(2, 6)}`;
};

const [userSnap, staffSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('staff').get(),
]);

const staffByUser = new Map();
staffSnap.docs.forEach((d) => {
    const v = d.data();
    if (v.userId) staffByUser.set(v.userId, d.id);
});

const missing = [];
const relink = [];
for (const d of userSnap.docs) {
    const u = { uid: d.id, ...d.data() };
    if (!TEACHING_ROLES.includes(u.role)) continue;
    const isDemo = String(u.email ?? '').endsWith('@ljeducare.demo');
    if (isDemo && !INCLUDE_DEMO) continue;

    const existing = staffByUser.get(u.uid);
    if (existing) {
        // Profile exists but users.staffId never got written — the cascade and the
        // teaching pages both look it up, so repair the link.
        if (!u.staffId) relink.push({ ...u, staffId: existing });
        continue;
    }
    missing.push(u);
}

const show = (u, extra = '') =>
    `  ${String(u.role).padEnd(14)} ${String(u.email ?? u.uid).padEnd(34)} ${extra}`;

console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'}${INCLUDE_DEMO ? ' (including demo accounts)' : ' (skipping @ljeducare.demo)'}\n`);
console.log(`create staff profile (${missing.length}):`);
missing.forEach((u) => console.log(show(u, 'commission starts at 0%')));
console.log(`\nrelink users.staffId only (${relink.length}):`);
relink.forEach((u) => console.log(show(u, `-> ${u.staffId}`)));

if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write.\n');
    process.exit(0);
}

let created = 0;
for (const u of missing) {
    const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || 'Staff member';
    const ref = db.collection('staff').doc();
    await ref.set({
        id: ref.id,
        userId: u.uid,
        name,
        slug: slug(name),
        email: u.email ?? '',
        profileImage: '',
        avatar: '',
        tagline: '',
        bio: '',
        subjects: [],
        commissionRate: 0,
        manualBalance: 0,
        totalEarned: 0,
        isPublished: false,
        createdAt: new Date().toISOString(),
    });
    await db.collection('users').doc(u.uid).update({ staffId: ref.id });
    created += 1;
}
for (const u of relink) {
    await db.collection('users').doc(u.uid).update({ staffId: u.staffId });
}
console.log(`\ncreated ${created} profile(s), relinked ${relink.length}.`);
console.log('Set each commission % in Admin → Staff before any payout runs.\n');
