/**
 * E2E test for per-month class RENEWAL against local emulators.
 *
 * Regression guard for the 2026-08-13 renewal deadlock: finalizeSale arrayUnions the
 * class id into users.enrolledClassIds permanently, and initiateEnrollment used to
 * short-circuit on mere enrollment (`alreadyEnrolled`) — so once a student paid for
 * ANY month they could never pay again, while zoom-handler/join.js kept telling them
 * RENEW_REQUIRED. Checkout bounced them to /student with no explanation.
 *
 * Covers:
 *   1. First purchase of a per-month class creates a sale stamped with coveredMonth.
 *   2. After it settles, re-buying the SAME month is idempotent (alreadyEnrolled).
 *   3. Re-buying a DIFFERENT (unpaid) month creates a NEW sale — the actual fix.
 *   4. A pending sale for month A is never reused as month B's payment.
 *   5. Non-per-month items still short-circuit on alreadyEnrolled (no behaviour change).
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
initializeApp({ projectId: 'demo-ljeducare' });
const db = getFirestore();

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake';
const FN = (name) => `http://127.0.0.1:5001/demo-ljeducare/asia-south1/${name}`;
const CLASS_ID = 'cls-physics-2026'; // seeded with weeklyPaymentOption: 'per_month'
const THIS_MONTH = '2026-08';
const NEXT_MONTH = '2026-09';

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
const admin = await signIn('admin@lj.test');
const uid = JSON.parse(Buffer.from(student.split('.')[1], 'base64').toString('utf8')).user_id;

// Reset: clear this student's sales + enrollment for the class so the run is idempotent.
const stale = await db.collection('sales').where('studentId', '==', uid).where('itemId', '==', CLASS_ID).get();
await Promise.all(stale.docs.map((d) => d.ref.delete()));
await db.doc(`users/${uid}`).update({ enrolledClassIds: [], enrolledCourseIds: [], enrolledQuizIds: [] });

// ── 1. First purchase stamps coveredMonth ────────────────────────────────────────────
const first = await call(
    'initiateEnrollment',
    { itemId: CLASS_ID, itemType: 'class', currency: 'LKR', method: 'bank_slip', coveredMonth: THIS_MONTH },
    student,
);
check('first purchase creates a sale', first.ok && !!first.result?.sale?.id, JSON.stringify(first.error ?? first.result));
const firstSaleId = first.result?.sale?.id;
check('sale stamped with the requested coveredMonth', first.result?.sale?.coveredMonth === THIS_MONTH, `coveredMonth=${first.result?.sale?.coveredMonth}`);

// ── 4. A pending sale for THIS month must not be reused for NEXT month ───────────────
const pendingOtherMonth = await call(
    'initiateEnrollment',
    { itemId: CLASS_ID, itemType: 'class', currency: 'LKR', method: 'bank_slip', coveredMonth: NEXT_MONTH },
    student,
);
check(
    'pending sale for another month is NOT reused (new sale minted)',
    pendingOtherMonth.result?.sale?.id !== firstSaleId && pendingOtherMonth.result?.sale?.coveredMonth === NEXT_MONTH,
    JSON.stringify({ id: pendingOtherMonth.result?.sale?.id, month: pendingOtherMonth.result?.sale?.coveredMonth }),
);
// ...but the same month DOES resume the same sale.
const sameMonthAgain = await call(
    'initiateEnrollment',
    { itemId: CLASS_ID, itemType: 'class', currency: 'LKR', method: 'bank_slip', coveredMonth: THIS_MONTH },
    student,
);
check('same month resumes the same pending sale', sameMonthAgain.result?.sale?.id === firstSaleId && sameMonthAgain.result?.resumed === true, JSON.stringify(sameMonthAgain.result));

// Settle THIS month's sale (slip → admin approval), which enrolls the student for good.
await call('attachPaymentSlip', { saleId: firstSaleId, slipImageUrl: 'https://example.com/slip.jpg' }, student);
const approval = await call('approveSlipSale', { saleId: firstSaleId, confirmedAmount: first.result.sale.amount }, admin);
check('slip approved → sale completed', approval.ok && approval.result?.success === true, JSON.stringify(approval.error));
const settled = (await db.collection('sales').doc(firstSaleId).get()).data();
check('sale is completed', settled.status === 'completed', `status=${settled.status}`);
const userAfter = (await db.doc(`users/${uid}`).get()).data();
check('student permanently enrolled in the class', (userAfter.enrolledClassIds || []).includes(CLASS_ID));

// ── 2. Same month again → idempotent, no new sale ────────────────────────────────────
const paidMonthAgain = await call(
    'initiateEnrollment',
    { itemId: CLASS_ID, itemType: 'class', currency: 'LKR', method: 'bank_slip', coveredMonth: THIS_MONTH },
    student,
);
check(
    'already-paid month short-circuits as alreadyEnrolled',
    paidMonthAgain.result?.alreadyEnrolled === true && paidMonthAgain.result?.coveredMonth === THIS_MONTH,
    JSON.stringify(paidMonthAgain.result),
);

// ── 3. THE FIX: an unpaid month must be payable despite permanent enrolment ──────────
const beforeCount = (await db.collection('sales').where('studentId', '==', uid).where('itemId', '==', CLASS_ID).get()).size;
const renewal = await call(
    'initiateEnrollment',
    { itemId: CLASS_ID, itemType: 'class', currency: 'LKR', method: 'bank_slip', coveredMonth: NEXT_MONTH },
    student,
);
check(
    'RENEWAL for an unpaid month is allowed (does NOT return alreadyEnrolled)',
    !renewal.result?.alreadyEnrolled,
    `got alreadyEnrolled=${renewal.result?.alreadyEnrolled} — this is the deadlock the fix removes`,
);
check('renewal yields a payable sale for that month', !!renewal.result?.sale?.id && renewal.result?.sale?.coveredMonth === NEXT_MONTH, JSON.stringify(renewal.result?.sale && { id: renewal.result.sale.id, month: renewal.result.sale.coveredMonth, status: renewal.result.sale.status }));
check('renewal sale is payable (pending, not completed)', ['pending_slip', 'pending_gateway'].includes(renewal.result?.sale?.status), `status=${renewal.result?.sale?.status}`);
const afterCount = (await db.collection('sales').where('studentId', '==', uid).where('itemId', '==', CLASS_ID).get()).size;
check('no duplicate sale spam for the renewal', afterCount === beforeCount, `before=${beforeCount} after=${afterCount} (resumed the existing NEXT_MONTH pending sale)`);

// ── 5. Non-per-month items keep the old short-circuit ────────────────────────────────
await db.doc(`users/${uid}`).update({ enrolledCourseIds: ['crs-mechanics'] });
const courseAgain = await call('initiateEnrollment', { itemId: 'crs-mechanics', itemType: 'course', currency: 'LKR', method: 'bank_slip' }, student);
check('non-per-month enrolled item still short-circuits', courseAgain.result?.alreadyEnrolled === true, JSON.stringify(courseAgain.result));

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
