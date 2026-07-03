/** E2E payment-flow test against local emulators (auth REST + callable REST + Firestore Admin). */
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
    if (body.error) throw new Error(`${name}: ${body.error.message || JSON.stringify(body.error)}`);
    return body.result;
}

const student = await signIn('student@lj.test');
const admin = await signIn('admin@lj.test');

// ── 1. FREE enrollment ────────────────────────────────────────────
const free = await call('initiateEnrollment', { itemId: 'cls-free-seminar', itemType: 'class', currency: 'LKR', method: 'marx' }, student);
check('free enrollment returns enrolled', free.enrolled === true || free.alreadyEnrolled === true, JSON.stringify(free));

const studentSnap = await db.collection('users').where('email', '==', 'student@lj.test').get();
const studentDoc = studentSnap.docs[0];
check('student enrolledClassIds contains free class', (studentDoc.data().enrolledClassIds || []).includes('cls-free-seminar'));

// idempotent repeat
const freeAgain = await call('initiateEnrollment', { itemId: 'cls-free-seminar', itemType: 'class', currency: 'LKR', method: 'marx' }, student);
check('repeat free enrollment is idempotent', freeAgain.alreadyEnrolled === true, JSON.stringify(freeAgain));

// ── 2. USD bank-slip enrollment on paid class (override $9.99) ───
const slip = await call('initiateEnrollment', { itemId: 'cls-physics-2026', itemType: 'class', currency: 'USD', method: 'bank_slip' }, student);
const sale = slip.sale;
check('slip sale created pending_slip', sale?.status === 'pending_slip', JSON.stringify(slip).slice(0, 200));
check('USD override amount 9.99', sale?.amount === 9.99, `amount=${sale?.amount}`);
check('fxRate snapshotted 0.0031', sale?.fxRate === 0.0031, `fx=${sale?.fxRate}`);
check('baseAmount ≈ 3222.58 LKR', Math.abs(sale?.baseAmount - 3222.58) < 0.01, `base=${sale?.baseAmount}`);

// student attaches a slip
await call('attachPaymentSlip', { saleId: sale.id, slipImageUrl: 'https://example.com/slip.jpg' }, student);
console.log('  slip attached');

// student CANNOT approve their own sale
let studentApproveBlocked = false;
try { await call('approveSlipSale', { saleId: sale.id }, student); } catch { studentApproveBlocked = true; }
check('student blocked from approveSlipSale', studentApproveBlocked);

// wrong-amount approval blocked
let wrongAmountBlocked = false;
try { await call('approveSlipSale', { saleId: sale.id, confirmedAmount: 5 }, admin); } catch { wrongAmountBlocked = true; }
check('wrong confirmedAmount blocked', wrongAmountBlocked);

// admin approves with the right amount
const approval = await call('approveSlipSale', { saleId: sale.id, confirmedAmount: 9.99 }, admin);
check('slip approved', approval.success === true, JSON.stringify(approval));

const settled = (await db.collection('sales').doc(sale.id).get()).data();
check('sale completed', settled.status === 'completed');
check('teacherCommission = 40% of base (1289.03)', Math.abs(settled.teacherCommission - 1289.03) < 0.01, `tc=${settled.teacherCommission}`);
check('instituteIncome = remainder (1933.55)', Math.abs(settled.instituteIncome - 1933.55) < 0.01, `ii=${settled.instituteIncome}`);
check('commission adds to baseAmount', Math.abs(settled.teacherCommission + settled.instituteIncome - settled.baseAmount) < 0.01);

const studentAfter = (await studentDoc.ref.get()).data();
check('student enrolled in paid class', (studentAfter.enrolledClassIds || []).includes('cls-physics-2026'));

const staff = (await db.collection('staff').doc('staff-tharindu').get()).data();
check('staff.totalEarned incremented', Math.abs((staff.totalEarned || 0) - 1289.03) < 0.01, `earned=${staff.totalEarned}`);

const ledger = await db.collection('financial_ledger').where('orderId', '==', sale.id).get();
check('ledger row written', ledger.size === 1);
if (ledger.size === 1) {
    const sum = ledger.docs[0].data().entries.reduce((a, e) => a + e.amount, 0);
    check('ledger entries sum to 0', Math.abs(sum) < 0.01, `sum=${sum}`);
}

// re-approval is idempotent (already completed)
let reapproveOk = true;
try {
    await call('approveSlipSale', { saleId: sale.id, confirmedAmount: 9.99 }, admin);
    reapproveOk = false; // should have thrown failed-precondition (not pending anymore)
} catch { /* expected */ }
check('re-approval of settled sale rejected', reapproveOk);

// ── 3. Pay & Reset ────────────────────────────────────────────────
const balance = await call('getTeacherBalance', { staffId: 'staff-tharindu' }, admin);
check('teacher balance owed = commission', Math.abs(balance.totalOwed - 1289.03) < 0.01, JSON.stringify(balance));

const payout = await call('payTeacher', { staffId: 'staff-tharindu', note: 'July settlement' }, admin);
check('payTeacher succeeds', payout.success === true && Math.abs(payout.amountPaid - 1289.03) < 0.01, JSON.stringify(payout));

const balanceAfter = await call('getTeacherBalance', { staffId: 'staff-tharindu' }, admin);
check('balance zero after Pay & Reset', balanceAfter.totalOwed === 0, JSON.stringify(balanceAfter));

const payments = await db.collection('teacher_payments').where('teacherId', '==', 'staff-tharindu').get();
check('teacher_payments log row written', payments.size === 1);

// double payout blocked
let doublePayBlocked = false;
try { await call('payTeacher', { staffId: 'staff-tharindu' }, admin); } catch { doublePayBlocked = true; }
check('second payTeacher blocked (nothing owed)', doublePayBlocked);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
