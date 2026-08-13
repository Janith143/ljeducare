/**
 * E2E test for the payment-method reconcile fix (2026-08-13 slip-page 404 bug) against
 * local emulators. Complements test-payments-emulator.mjs, which doesn't exercise
 * method-switching at all.
 *
 * Covers, without needing real PayPal/OnePay credentials (those calls happen strictly
 * after the guards under test, so they're reachable via pre-network early returns/throws):
 *   1. Switching method on a reused sale reconciles status/gateway (the reported bug).
 *   2. An abandoned gateway attempt is retired into abandonedGatewayOrderIds, not left live.
 *   3. Switching back doesn't re-increment gatewayAttempt when there's nothing to retire.
 *   4. A submitted slip blocks a further method switch (blocked: 'awaiting_approval').
 *   5. An unsupported method (marx) is rejected before any sale is written.
 *   6. Free enrollment doesn't require a method at all.
 *   7. paypalCaptureOrder's new status guard rejects a non-payable sale pre-network.
 *   8. onepayCreateCheckout's guards (alreadyCompleted / non-payable) fire pre-network.
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
initializeApp({ projectId: 'demo-ljeducare' });
const db = getFirestore();

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake';
const FN = (name) => `http://127.0.0.1:5001/demo-ljeducare/asia-south1/${name}`;

let failures = 0;
function check(label, cond, detail = '') {
    console.log(`${cond ? '✔' : '✘'} ${label}${cond ? '' : ` — ${detail}`}`);
    if (!cond) failures++;
}

async function signIn(email) {
    const res = await fetch(AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123', returnSecureToken: true }),
    });
    const data = await res.json();
    if (!data.idToken) throw new Error(`signIn failed for ${email}: ${JSON.stringify(data.error)}`);
    return data.idToken;
}

async function call(name, data, token) {
    const res = await fetch(FN(name), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ data }),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: !body.error, result: body.result, error: body.error };
}

const student = await signIn('student@lj.test');

// Reset any state left over from a prior run of this script (or test-payments-emulator.mjs)
// against the same persistent emulator — this script must be safely re-runnable without a
// full reseed, matching test-payments-emulator.mjs's "rerunnable" convention.
await resetTestState(await uidFor(student));

// ── 1-3. Method switch reconciles status/gateway; abandon+retire; no double-increment ──
const first = await call('initiateEnrollment', { itemId: 'crs-mechanics', itemType: 'course', currency: 'LKR', method: 'paypal' }, student);
check('mint via paypal -> pending_gateway', first.ok && first.result?.sale?.status === 'pending_gateway', JSON.stringify(first));
const saleId = first.result?.sale?.id;

// Simulate paypalCreateOrder having run (no live PayPal creds locally — stamp the field it would set).
await db.collection('sales').doc(saleId).update({ gatewayOrderId: 'FAKE-PAYPAL-ORDER-1' });

const switched = await call('initiateEnrollment', { itemId: 'crs-mechanics', itemType: 'course', currency: 'LKR', method: 'bank_slip' }, student);
check('switch to bank_slip returns same saleId (resumed)', switched.result?.sale?.id === saleId && switched.result?.resumed === true, JSON.stringify(switched));
check('reconciled to pending_slip', switched.result?.sale?.status === 'pending_slip', JSON.stringify(switched.result?.sale));
check('gateway switched to bank_slip', switched.result?.sale?.gateway === 'bank_slip');
check('paymentMethod switched to bank_transfer', switched.result?.sale?.paymentMethod === 'bank_transfer');
check('pendingAdminApproval set', switched.result?.sale?.pendingAdminApproval === true);
check('gatewayOrderId cleared', switched.result?.sale?.gatewayOrderId === undefined, JSON.stringify(switched.result?.sale?.gatewayOrderId));

const afterSwitch = (await db.collection('sales').doc(saleId).get()).data();
check('Firestore: gatewayOrderId actually deleted', afterSwitch.gatewayOrderId === undefined);
check('Firestore: abandoned order retired', (afterSwitch.abandonedGatewayOrderIds || []).includes('FAKE-PAYPAL-ORDER-1'), JSON.stringify(afterSwitch.abandonedGatewayOrderIds));
check('Firestore: gatewayAttempt = 1', afterSwitch.gatewayAttempt === 1, `gatewayAttempt=${afterSwitch.gatewayAttempt}`);

const backToPaypal = await call('initiateEnrollment', { itemId: 'crs-mechanics', itemType: 'course', currency: 'LKR', method: 'paypal' }, student);
check('switch back to paypal -> pending_gateway', backToPaypal.result?.sale?.status === 'pending_gateway', JSON.stringify(backToPaypal.result?.sale));
check('pendingAdminApproval cleared on switch away from bank_slip', backToPaypal.result?.sale?.pendingAdminApproval === undefined);
const afterSecondSwitch = (await db.collection('sales').doc(saleId).get()).data();
check('no gatewayOrderId to retire this time -> gatewayAttempt unchanged at 1', afterSecondSwitch.gatewayAttempt === 1, `gatewayAttempt=${afterSecondSwitch.gatewayAttempt}`);

// ── 4. A submitted slip blocks further method switching ──────────────────────────────
await call('initiateEnrollment', { itemId: 'crs-mechanics', itemType: 'course', currency: 'LKR', method: 'bank_slip' }, student);
await db.collection('sales').doc(saleId).update({ slipImageUrl: 'https://example.com/fake-slip.jpg' });
const blocked = await call('initiateEnrollment', { itemId: 'crs-mechanics', itemType: 'course', currency: 'LKR', method: 'paypal' }, student);
check('slip-submitted sale reports blocked: awaiting_approval', blocked.result?.blocked === 'awaiting_approval', JSON.stringify(blocked.result));
const afterBlocked = (await db.collection('sales').doc(saleId).get()).data();
check('blocked sale left untouched (still bank_slip/pending_slip)', afterBlocked.gateway === 'bank_slip' && afterBlocked.status === 'pending_slip');

// ── 5. Unsupported method is rejected before any sale is written ─────────────────────
const beforeCount = (await db.collection('sales').where('studentId', '==', await uidFor(student)).where('itemId', '==', 'cls-physics-2026').get()).size;
const marx = await call('initiateEnrollment', { itemId: 'cls-physics-2026', itemType: 'class', currency: 'LKR', method: 'marx' }, student);
check('marx (unsupported) rejected with invalid-argument', !marx.ok && marx.error?.status === 'INVALID_ARGUMENT', JSON.stringify(marx.error));
const afterCount = (await db.collection('sales').where('studentId', '==', await uidFor(student)).where('itemId', '==', 'cls-physics-2026').get()).size;
check('no sale document was created for the rejected attempt', afterCount === beforeCount, `before=${beforeCount} after=${afterCount}`);

// ── 6. Free enrollment needs no method ────────────────────────────────────────────────
const free = await call('initiateEnrollment', { itemId: 'cls-free-seminar', itemType: 'class', currency: 'LKR' }, student);
check('free enrollment succeeds with no method', free.ok && (free.result?.enrolled === true || free.result?.alreadyEnrolled === true), JSON.stringify(free));

// ── 7. paypalCaptureOrder's new status guard fires before any PayPal network call ────
const staleId = 'TEST-STALE-SALE-1';
await db.collection('sales').doc(staleId).set({
    id: staleId, studentId: await uidFor(student), status: 'canceled', gatewayOrderId: 'FAKE-ORDER',
    amount: 100, currency: 'LKR', itemName: 'Test', itemType: 'course', itemId: 'crs-mechanics',
});
const captureAttempt = await call('paypalCaptureOrder', { saleId: staleId }, student);
check(
    'capture on a canceled sale rejected by the new status guard (not a network error)',
    !captureAttempt.ok && /no longer a gateway payment/.test(captureAttempt.error?.message || ''),
    JSON.stringify(captureAttempt.error),
);

// ── 8. onepayCreateCheckout guards fire before any OnePay network call ───────────────
const completedId = 'TEST-COMPLETED-SALE-1';
await db.collection('sales').doc(completedId).set({
    id: completedId, studentId: await uidFor(student), status: 'completed',
    amount: 100, currency: 'LKR', itemName: 'Test', itemType: 'course', itemId: 'crs-mechanics',
});
const onepayOnCompleted = await call('onepayCreateCheckout', { saleId: completedId }, student);
check('onepayCreateCheckout on a completed sale short-circuits (alreadyCompleted)', onepayOnCompleted.ok && onepayOnCompleted.result?.alreadyCompleted === true, JSON.stringify(onepayOnCompleted));

const onepayOnCanceled = await call('onepayCreateCheckout', { saleId: staleId }, student);
check(
    'onepayCreateCheckout on a canceled sale rejected pre-network',
    !onepayOnCanceled.ok && /not payable via OnePay/.test(onepayOnCanceled.error?.message || ''),
    JSON.stringify(onepayOnCanceled.error),
);

async function uidFor(idToken) {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf8'));
    return payload.user_id || payload.sub;
}

/** Wipe every sale + enrollment this script touches so re-running it is truly idempotent. */
async function resetTestState(uid) {
    const itemIds = ['crs-mechanics', 'cls-physics-2026'];
    const snap = await db.collection('sales').where('studentId', '==', uid).where('itemId', 'in', itemIds).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
    await db.doc(`users/${uid}`).update({ enrolledClassIds: [], enrolledCourseIds: [] });
    for (const staleId of ['TEST-STALE-SALE-1', 'TEST-COMPLETED-SALE-1']) {
        await db.collection('sales').doc(staleId).delete();
    }
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
