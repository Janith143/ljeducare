/** E2E Phase-2 test: quiz grading, certificates, exam data. Run after seed. */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
initializeApp({ projectId: 'demo-ljeducare' });
const db = getFirestore();

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake';
const FN = (name) => `http://127.0.0.1:5001/demo-ljeducare/asia-south1/${name}`;

let failures = 0;
const check = (label, cond, detail = '') => {
    console.log(`${cond ? '✔' : '✘'} ${label}${cond ? '' : ` — ${detail}`}`);
    if (!cond) failures++;
};

async function signIn(email) {
    const res = await fetch(AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123', returnSecureToken: true }),
    });
    const data = await res.json();
    if (!data.idToken) throw new Error(`signIn ${email}`);
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

const student = await signIn('student@lj.test');
const admin = await signIn('admin@lj.test');
const teacher = await signIn('teacher@lj.test');

// ── Seed a free quiz with known answers ──────────────────────────
const quiz = {
    id: 'qz-test', teacherId: 'staff-tharindu', title: 'Physics Basics Quiz', slug: 'physics-basics',
    description: 'test', subject: 'Physics', date: '2026-07-05', startTime: '10:00', durationMinutes: 10,
    pricing: { basePrice: 0, isFree: true },
    questions: [
        { id: 'q1', text: '2+2?', answers: [{ id: 'a1', text: '3', isCorrect: false }, { id: 'a2', text: '4', isCorrect: true }] },
        { id: 'q2', text: 'Unit of force?', answers: [{ id: 'b1', text: 'Newton', isCorrect: true }, { id: 'b2', text: 'Joule', isCorrect: false }] },
        { id: 'q3', text: 'Speed of light?', answers: [{ id: 'c1', text: '3e8 m/s', isCorrect: true }, { id: 'c2', text: '3e6 m/s', isCorrect: false }] },
    ],
    status: 'scheduled', isPublished: true, createdAt: new Date().toISOString(),
};
await db.doc('quizzes/qz-test').set(quiz);

// ── Quiz grading ─────────────────────────────────────────────────
const result = await call('submitQuiz', {
    quizId: 'qz-test',
    answers: [
        { questionId: 'q1', selectedAnswerIds: ['a2'] }, // right
        { questionId: 'q2', selectedAnswerIds: ['b2'] }, // wrong
        { questionId: 'q3', selectedAnswerIds: ['c1'] }, // right
    ],
}, student.token);
check('quiz graded server-side: 2/3', result.score === 2 && result.total === 3, JSON.stringify(result));

let retakeBlocked = false;
try { await call('submitQuiz', { quizId: 'qz-test', answers: [] }, student.token); } catch { retakeBlocked = true; }
check('retake blocked (one attempt)', retakeBlocked);

let teacherBlocked = false;
try { await call('submitQuiz', { quizId: 'qz-test', answers: [] }, teacher.token); } catch { teacherBlocked = true; }
check('non-student blocked from submitQuiz', teacherBlocked);

// ── Certificates ─────────────────────────────────────────────────
// Enroll student in the seeded course first (free path won't work — it's paid; grant directly).
await db.doc(`users/${student.uid}`).set({ enrolledCourseIds: ['crs-mechanics'] }, { merge: true });

const issued = await call('issueCertificate', { studentId: student.uid, courseId: 'crs-mechanics' }, admin.token);
check('certificate issued with LJC id', /^LJC-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(issued.verificationId), JSON.stringify(issued));

const again = await call('issueCertificate', { studentId: student.uid, courseId: 'crs-mechanics' }, admin.token);
check('re-issue idempotent (same id)', again.alreadyIssued === true && again.verificationId === issued.verificationId);

// teacher can issue for OWN course (course teacher = staff-tharindu = teacher@lj.test)
const student2Ref = db.collection('users').doc();
await student2Ref.set({
    id: student2Ref.id, uid: student2Ref.id, firstName: 'Kamala', lastName: 'Perera', email: 'k@lj.test',
    role: 'student', avatar: '', status: 'active', enrolledCourseIds: ['crs-mechanics'],
});
const teacherIssued = await call('issueCertificate', { studentId: student2Ref.id, courseId: 'crs-mechanics' }, teacher.token);
check('teacher issues for own course', !!teacherIssued.verificationId, JSON.stringify(teacherIssued));

let notEnrolledBlocked = false;
const student3Ref = db.collection('users').doc();
await student3Ref.set({ id: student3Ref.id, uid: student3Ref.id, firstName: 'X', lastName: 'Y', email: 'x@lj.test', role: 'student', avatar: '', status: 'active' });
try { await call('issueCertificate', { studentId: student3Ref.id, courseId: 'crs-mechanics' }, admin.token); } catch { notEnrolledBlocked = true; }
check('certificate blocked for non-enrolled student', notEnrolledBlocked);

// students cannot issue
let studentIssueBlocked = false;
try { await call('issueCertificate', { studentId: student.uid, courseId: 'crs-mechanics' }, student.token); } catch { studentIssueBlocked = true; }
check('student blocked from issueCertificate', studentIssueBlocked);

// ── Exam + recording fixture data (page checks happen in the browser) ──
await db.doc(`users/${student.uid}`).set({ enrolledClassIds: ['cls-physics-2026'] }, { merge: true });
await db.doc('classes/cls-physics-2026').set(
    {
        examResults: [{
            id: 'ex1', name: 'March Model Paper', category: 'Model Papers', date: '2026-06-15', maxMark: 100,
            studentScores: [{ studentId: student.uid, score: 78 }], createdAt: new Date().toISOString(),
        }],
        examCategories: ['Model Papers'],
        recordingUrls: { '2026-06-29': ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'] },
        recordingMaxViews: 2,
    },
    { merge: true },
);
console.log('  exam + recording fixtures written');

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
