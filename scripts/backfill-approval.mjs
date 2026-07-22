#!/usr/bin/env node
/**
 * One-off: mark already-published content as approved.
 *
 * Publishing is now gated on `adminApproval === 'approved'`. Content that went live
 * BEFORE the approval workflow existed has adminApproval 'not_requested', so without
 * this a teacher would see a live class listed as an unapproved draft and be unable to
 * republish it after unpublishing. Being live already IS the approval.
 *
 * Drafts are deliberately left alone — teachers submit those through the new flow.
 *
 *   node scripts/backfill-approval.mjs           # dry run
 *   node scripts/backfill-approval.mjs --apply
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
const projectId = process.env.GCLOUD_PROJECT ?? 'ljeducare';
initializeApp({ projectId });
const db = getFirestore();

const COLLECTIONS = ['classes', 'courses', 'quizzes'];
let planned = 0;

for (const col of COLLECTIONS) {
    const snap = await db.collection(col).where('isPublished', '==', true).get();
    const targets = snap.docs.filter((d) => (d.data() || {}).adminApproval !== 'approved');
    console.log(`${col}: ${targets.length} published item(s) need adminApproval='approved'`);
    targets.forEach((d) => console.log(`   ${d.id}  ${String((d.data() || {}).title || '').slice(0, 40)}`));
    planned += targets.length;

    if (APPLY && targets.length) {
        for (let i = 0; i < targets.length; i += 400) {
            const batch = db.batch();
            targets.slice(i, i + 400).forEach((d) =>
                batch.update(d.ref, {
                    adminApproval: 'approved',
                    approvedAt: new Date().toISOString(),
                    approvedBy: 'script:backfill-approval (was already live)',
                }),
            );
            await batch.commit();
        }
    }
}

console.log(
    planned === 0
        ? '\nNothing to do.'
        : APPLY
          ? `\nApproved ${planned} already-published item(s).`
          : '\nDry run only. Re-run with --apply to write.',
);
