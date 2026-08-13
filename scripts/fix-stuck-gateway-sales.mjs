#!/usr/bin/env node
/**
 * One-off: cancel sales stuck in 'pending_gateway' with gateway 'marx'.
 *
 * Root cause: LKR checkout defaulted to 'marx', a card gateway that was never
 * implemented — it minted a sale, then just showed an error and left it orphaned.
 * The idempotent reuse path in initiateEnrollment then handed that same stale sale
 * back on every retry (including switching to bank transfer), which is what produced
 * the /payment/slip/<id> 404 reported 2026-08-13 (INV-MSR4KVLC-7382 and 4 others).
 * Fixed going forward by enroll.js's reconcileReusedSale + METHODS enforcement, and
 * by replacing 'marx' with a working OnePay integration. This script only repairs the
 * sales that were already stuck before that fix shipped.
 *
 * Canceled, not flipped to pending_slip: these are up to weeks stale, some are
 * per-month classes whose coveredMonth is frozen at the original month, and the item
 * may have changed price or been unpublished since. After the enroll.js fix, a
 * canceled sale is excluded from the reuse path, so the student's next checkout mints
 * a clean sale at the current price — surfaced via the "Buy again" link on
 * /student/transactions.
 *
 * A sale with a real gatewayOrderId (a genuine in-flight payment attempt) is never
 * touched — it's skipped and printed loudly for manual review.
 *
 *   node scripts/fix-stuck-gateway-sales.mjs           # dry run
 *   node scripts/fix-stuck-gateway-sales.mjs --apply
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
const projectId = process.env.GCLOUD_PROJECT ?? 'ljeducare';
initializeApp({ projectId });
const db = getFirestore();

const CANCEL_REASON =
    'Card payment gateway was unavailable — please check out again and choose Bank transfer or Card payment.';

const snap = await db.collection('sales').where('status', '==', 'pending_gateway').get();
const marxSales = snap.docs.filter((d) => (d.data() || {}).gateway === 'marx');
const withLiveOrder = marxSales.filter((d) => !!(d.data() || {}).gatewayOrderId);
const targets = marxSales.filter((d) => !(d.data() || {}).gatewayOrderId);

console.log(`pending_gateway + gateway:'marx': ${marxSales.length} total`);

if (withLiveOrder.length) {
    console.log(`\n⚠ SKIPPING ${withLiveOrder.length} with a gatewayOrderId set — review manually, do not auto-cancel:`);
    withLiveOrder.forEach((d) => {
        const s = d.data();
        console.log(`   ${d.id}  gatewayOrderId=${s.gatewayOrderId}  ${s.studentSnapshot?.name ?? ''}`);
    });
}

console.log(`\n${targets.length} sale(s) will be canceled:`);
targets.forEach((d) => {
    const s = d.data();
    console.log(
        `   ${d.id}  ${s.saleDate?.slice(0, 10)}  ${s.studentSnapshot?.name ?? '?'}  ` +
            `${s.itemType}/${s.itemId}  "${s.itemName}"  ${s.amount} ${s.currency}` +
            (s.coveredMonth ? `  coveredMonth=${s.coveredMonth}` : ''),
    );
});

if (APPLY && targets.length) {
    const now = new Date().toISOString();
    for (let i = 0; i < targets.length; i += 400) {
        const batch = db.batch();
        targets.slice(i, i + 400).forEach((d) =>
            batch.update(d.ref, {
                status: 'canceled',
                canceledAt: now,
                canceledBy: 'script:fix-stuck-gateway-sales',
                cancelReason: CANCEL_REASON,
            }),
        );
        await batch.commit();
    }
}

console.log(
    targets.length === 0
        ? '\nNothing to do.'
        : APPLY
          ? `\nCanceled ${targets.length} stuck sale(s). Affected students can now re-checkout from the item page ("Buy again" on /student/transactions).`
          : '\nDry run only. Re-run with --apply to write.',
);
