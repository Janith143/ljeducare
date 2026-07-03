/** E2E kiosk-attendance test against local emulators. Run after seed. */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
initializeApp({ projectId: 'demo-ljeducare' });
const db = getFirestore();

const AUTH_BASE = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const FN = (name) => `http://127.0.0.1:5001/demo-ljeducare/asia-south1/${name}`;

let failures = 0;
const check = (label, cond, detail = '') => {
    console.log(`${cond ? '✔' : '✘'} ${label}${cond ? '' : ` — ${detail}`}`);
    if (!cond) failures++;
};

async function signIn(email) {
    const res = await fetch(`${AUTH_BASE}/accounts:signInWithPassword?key=fake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123', returnSecureToken: true }),
    });
    const data = await res.json();
    if (!data.idToken) throw new Error(`signIn ${email}: ${JSON.stringify(data.error)}`);
    return { token: data.idToken, uid: data.localId };
}

async function call(name, data, token) {
    const res = await fetch(FN(name), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ data }),
    });
    const body = await res.json().catch(() => ({}));
    if (body.error) throw new Error(body.error.message || JSON.stringify(body.error));
    return body.result;
}

const admin = await signIn('admin@lj.test');
const student = await signIn('student@lj.test');

// Guardian contact on the student → marks should queue alerts.
await db.doc(`users/${student.uid}`).set({ guardianPhone: '0771234567', guardianEmail: 'parent@lj.test' }, { merge: true });

// Student enrolls in the FREE class first (has access).
await call('initiateEnrollment', { itemId: 'cls-free-seminar', itemType: 'class', currency: 'LKR', method: 'marx' }, student.token);

// ── Kiosk pairing ────────────────────────────────────────────────
const pairing = await call('createKioskPairingCode', { label: 'Test tablet' }, admin.token);
check('pairing code issued (6 digits)', /^\d{6}$/.test(pairing.code), JSON.stringify(pairing));

const exchange = await call('exchangeKioskPairingCode', { code: pairing.code });
check('code exchanged for custom token', typeof exchange.token === 'string');

const kioskSignIn = await fetch(`${AUTH_BASE}/accounts:signInWithCustomToken?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: exchange.token, returnSecureToken: true }),
});
const kiosk = await kioskSignIn.json();
check('kiosk signed in', !!kiosk.idToken);

let reuseBlocked = false;
try { await call('exchangeKioskPairingCode', { code: pairing.code }); } catch { reuseBlocked = true; }
check('pairing code single-use', reuseBlocked);

// ── Mark: enrolled path ──────────────────────────────────────────
const mark1 = await call('markAttendance', { classId: 'cls-free-seminar', studentId: student.uid, payment: 'enrolled' }, kiosk.idToken);
check('enrolled student marked', mark1.success === true && mark1.paymentStatus === 'paid', JSON.stringify(mark1));

const mark1b = await call('markAttendance', { classId: 'cls-free-seminar', studentId: student.uid, payment: 'enrolled' }, kiosk.idToken);
check('duplicate mark idempotent', mark1b.alreadyMarked === true);

// ── Not enrolled → cash path ─────────────────────────────────────
let notEnrolled = false;
try { await call('markAttendance', { classId: 'cls-physics-2026', studentId: student.uid, payment: 'enrolled' }, kiosk.idToken); }
catch (e) { notEnrolled = e.message.includes('NOT_ENROLLED'); }
check('non-enrolled mark rejected with NOT_ENROLLED', notEnrolled);

const cash = await call('markAttendance', { classId: 'cls-physics-2026', studentId: student.uid, payment: 'cash' }, kiosk.idToken);
check('cash mark succeeds', cash.success === true && cash.paymentStatus === 'paid_at_venue', JSON.stringify(cash));

// cash sale settled with commission
const cashSales = await db.collection('sales')
    .where('studentId', '==', student.uid).where('itemId', '==', 'cls-physics-2026').get();
const cashSale = cashSales.docs.map((d) => d.data()).find((s) => s.paymentMethod === 'manual_at_venue');
check('cash sale completed, LKR 2500', cashSale?.status === 'completed' && cashSale?.baseAmount === 2500, JSON.stringify({ st: cashSale?.status, base: cashSale?.baseAmount }));
check('cash commission split 40%', cashSale?.teacherCommission === 1000 && cashSale?.instituteIncome === 1500, `tc=${cashSale?.teacherCommission} ii=${cashSale?.instituteIncome}`);

const studentDoc = (await db.doc(`users/${student.uid}`).get()).data();
check('cash mark granted enrollment', (studentDoc.enrolledClassIds || []).includes('cls-physics-2026'));

// ── Unpaid path (second student) ─────────────────────────────────
const signUp = await fetch(`${AUTH_BASE}/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student2@lj.test', password: 'password123', returnSecureToken: true }),
});
const student2 = await signUp.json();
await db.doc(`users/${student2.localId}`).set({
    id: student2.localId, uid: student2.localId, firstName: 'Nimal', lastName: 'Fernando',
    email: 'student2@lj.test', role: 'student', avatar: '', status: 'active',
    guardianPhone: '0779876543',
});

const unpaid = await call('markAttendance', { classId: 'cls-physics-2026', studentId: student2.localId, payment: 'unpaid' }, kiosk.idToken);
check('unpaid mark succeeds', unpaid.success === true && unpaid.paymentStatus === 'unpaid', JSON.stringify(unpaid));

const attSale = await db.collection('sales').where('studentId', '==', student2.localId).get();
const grant = attSale.docs.map((d) => d.data())[0];
check('unpaid = zero-value ATT access grant', grant?.id?.startsWith('ATT-') && grant?.baseAmount === 0 && grant?.freeSession === true, JSON.stringify({ id: grant?.id, base: grant?.baseAmount }));

// ── Roster + guardian outbox ─────────────────────────────────────
const roster = await call('getSessionAttendance', { classId: 'cls-physics-2026' }, kiosk.idToken);
check('roster has 2 records', roster.records.length === 2, `len=${roster.records.length}`);

// Give the outbox trigger time (first event cold-starts the function).
await new Promise((r) => setTimeout(r, 15000));
const outbox = await db.collection('notifications_outbox').get();
const alerts = outbox.docs.map((d) => d.data());
check('guardian alerts queued (3 marks w/ guardians)', alerts.length === 3, `len=${alerts.length}`);
check('alerts delivered (sent_dev — no SMS/SMTP creds locally)', alerts.every((a) => a.status === 'sent_dev'), JSON.stringify(alerts.map((a) => a.status)));

// students cannot call markAttendance
let studentBlocked = false;
try { await call('markAttendance', { classId: 'cls-physics-2026', studentId: student.uid, payment: 'enrolled' }, student.token); }
catch { studentBlocked = true; }
check('student blocked from markAttendance', studentBlocked);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
