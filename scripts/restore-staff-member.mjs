#!/usr/bin/env node
/**
 * Undo a Staff → Remove for one or more accounts.
 *
 * removeStaffAction soft-deletes the staff profile, cascades their content out of
 * sight, and disables the login — while telling the admin they can "reactivate the
 * account later under Users". Reactivating only ever restored the login and the
 * content, never the profile, and the recycle bin covers content only, so a removed
 * staff member could not be brought back at all. setUserStatusAction now clears
 * isDeleted too; this repairs the accounts removed before that fix.
 *
 * Mirrors restoreTeacherContent(): only content tagged `cascadedFromTeacher` for THIS
 * staff id is touched, so anything deleted deliberately stays deleted. Content comes
 * back accessible but NOT republished — going public again stays a deliberate act.
 *
 *   node scripts/restore-staff-member.mjs a@b.com c@d.com            # dry run
 *   node scripts/restore-staff-member.mjs a@b.com --apply
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const APPLY = process.argv.includes('--apply');
const emails = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!emails.length) {
    console.error('Usage: node scripts/restore-staff-member.mjs <email> [more emails] [--apply]');
    process.exit(1);
}

initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'ljeducare' });
const db = getFirestore();
const auth = getAuth();

const CONTENT = ['classes', 'courses', 'quizzes'];
const stamp = new Date().toISOString();

for (const email of emails) {
    console.log(`\n=== ${email} ===`);

    const userQ = await db.collection('users').where('email', '==', email).limit(1).get();
    if (userQ.empty) {
        console.log('  no user account with that email — skipped');
        continue;
    }
    const userDoc = userQ.docs[0];
    const user = userDoc.data();

    const staffQ = await db.collection('staff').where('userId', '==', userDoc.id).limit(1).get();
    if (staffQ.empty) {
        console.log('  no staff profile linked — skipped');
        continue;
    }
    const staffDoc = staffQ.docs[0];
    const staff = staffDoc.data();

    let disabled = null;
    try {
        disabled = (await auth.getUser(userDoc.id)).disabled;
    } catch {
        /* no auth account */
    }

    // Only what this staff member's removal hid.
    const hidden = {};
    for (const col of CONTENT) {
        const snap = await db.collection(col).where('cascadedFromTeacher', '==', staffDoc.id).get();
        const targets = snap.docs.filter((d) => d.data().isDeleted === true);
        if (targets.length) hidden[col] = targets;
    }
    const hiddenTotal = Object.values(hidden).reduce((n, a) => n + a.length, 0);

    console.log(`  role                ${user.role}`);
    console.log(`  staff profile       isDeleted=${!!staff.isDeleted}${staff.deletedAt ? ` (removed ${staff.deletedAt})` : ''}`);
    console.log(`  login               disabled=${disabled}`);
    console.log(`  users.status        ${user.status ?? '-'}`);
    console.log(`  commission          ${staff.commissionRate ?? 0}%`);
    console.log(`  content to unhide   ${hiddenTotal}${hiddenTotal ? ` (${Object.entries(hidden).map(([k, v]) => `${k}:${v.length}`).join(', ')})` : ''}`);

    if (!APPLY) continue;

    await staffDoc.ref.set(
        { isDeleted: false, deletedAt: null, deletedBy: null, restoredAt: stamp },
        { merge: true },
    );
    await userDoc.ref.set({ status: 'active' }, { merge: true });
    try {
        await auth.updateUser(userDoc.id, { disabled: false });
    } catch {
        /* no auth account to re-enable */
    }
    for (const [, targets] of Object.entries(hidden)) {
        for (let i = 0; i < targets.length; i += 400) {
            const batch = db.batch();
            targets.slice(i, i + 400).forEach((d) =>
                batch.update(d.ref, {
                    isDeleted: false,
                    cascadedFromTeacher: null,
                    cascadedReason: null,
                    cascadedAt: null,
                    cascadedBy: null,
                    restoredAt: stamp,
                    restoredBy: 'script:restore-staff-member',
                }),
            );
            await batch.commit();
        }
    }
    console.log('  RESTORED — profile visible under Staff, login re-enabled, content accessible (still unpublished)');
}

if (!APPLY) console.log('\nDry run. Re-run with --apply to write.\n');
