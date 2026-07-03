/**
 * Seed LJ Educare with demo content + users on the LIVE project.
 * Every record is tagged `mock: true`; every login uses `@ljeducare.demo`.
 * Remove later with:  node scripts/remove-mock-data.mjs
 *
 * Run:  GOOGLE_APPLICATION_CREDENTIALS=<sa-key.json> \
 *         node scripts/seed-mock-data.mjs
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { MOCK_PASSWORD, USERS, STAFF, CLASSES, COURSES, QUIZZES } from './mock-data.mjs';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to the service-account key path.');
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))), projectId: 'ljeducare' });

const auth = getAuth();
const db = getFirestore();
const now = new Date().toISOString();
const mock = (o) => ({ ...o, mock: true });
const round = (n) => Math.round(n * 100) / 100;
let counts = { users: 0, sales: 0, docs: 0 };

async function upsertUser(u) {
    let rec;
    try {
        rec = await auth.getUserByEmail(u.email);
        await auth.updateUser(rec.uid, { password: MOCK_PASSWORD, displayName: `${u.firstName} ${u.lastName}` });
    } catch {
        rec = await auth.createUser({ email: u.email, password: MOCK_PASSWORD, displayName: `${u.firstName} ${u.lastName}` });
    }
    const claims = { role: u.role, mock: true };
    if (u.role === 'student') claims.sid = rec.uid;
    if (u.staffId) claims.tid = u.staffId;
    await auth.setCustomUserClaims(rec.uid, claims);
    await db.doc(`users/${rec.uid}`).set(mock({
        id: rec.uid, uid: rec.uid, firstName: u.firstName, lastName: u.lastName, email: u.email,
        role: u.role, avatar: '', status: 'active', preferredCurrency: 'LKR',
        ...(u.staffId ? { staffId: u.staffId } : {}),
        ...(u.guardianPhone ? { guardianPhone: u.guardianPhone, guardianEmail: u.guardianEmail } : {}),
        enrolledClassIds: [], enrolledCourseIds: [], enrolledQuizIds: [], createdAt: now, registrationSource: 'mock-seed',
    }), { merge: true });
    counts.users++;
    return rec.uid;
}

async function run() {
    // 1) Currency settings (real config — left in place on teardown).
    await db.doc('settings/currencies').set({
        base: 'LKR', enabled: ['LKR', 'USD', 'GBP', 'AUD'],
        rates: { USD: { rate: 0.0031, updatedAt: now }, GBP: { rate: 0.0024, updatedAt: now }, AUD: { rate: 0.0047, updatedAt: now } },
        ratesUpdatedBy: 'mock-seed',
    }, { merge: true });

    // 2) Users + uid map.
    const uid = {};
    for (const u of USERS) uid[u.email] = await upsertUser(u);
    const students = USERS.filter((u) => u.role === 'student').map((u) => ({ ...u, uid: uid[u.email] }));

    // 3) Staff profiles.
    const staffEarned = {};
    for (const s of STAFF) {
        staffEarned[s.id] = 0;
        await db.doc(`staff/${s.id}`).set(mock({
            id: s.id, userId: uid[s.email], name: s.name, slug: s.id.replace('mock-staff-', 'mock-') + '-' + s.name.toLowerCase().replace(/\s+/g, '-'),
            email: s.email, profileImage: '', avatar: '', tagline: s.tagline, bio: `${s.name} teaches ${s.subjects.join(', ')} at LJ Educare with ${s.experienceYears}+ years of experience.`,
            subjects: s.subjects, qualifications: ['BSc', 'MSc (Reading)'], experienceYears: s.experienceYears,
            commissionRate: s.commissionRate, manualBalance: 0, totalEarned: 0, isPublished: true, createdAt: now,
        }), { merge: true });
        counts.docs++;
    }
    const rateOf = Object.fromEntries(STAFF.map((s) => [s.id, s.commissionRate]));

    // 4) Content: classes / courses / quizzes.
    for (const c of CLASSES) {
        await db.doc(`classes/${c.id}`).set(mock({
            id: c.id, teacherId: c.teacherId, title: c.title, slug: c.id, subject: c.subject,
            description: `${c.title} — comprehensive ${c.subject} class for ${c.targetAudience}.`,
            date: c.date, startTime: c.startTime, endTime: c.endTime, pricing: c.pricing, targetAudience: c.targetAudience,
            mode: c.mode, recurrence: c.recurrence, ...(c.weeklyPaymentOption ? { weeklyPaymentOption: c.weeklyPaymentOption } : {}),
            medium: c.medium, grade: c.grade, status: 'scheduled', isPublished: true, adminApproval: 'approved',
            ...(c.recordings ? { recordingUrls: c.recordings, recordingMaxViews: c.recordingMaxViews ?? 0, recordingExpiryDays: 60 } : {}),
            createdAt: now,
        }), { merge: true });
        counts.docs++;
    }
    for (const c of COURSES) {
        await db.doc(`courses/${c.id}`).set(mock({
            id: c.id, teacherId: c.teacherId, title: c.title, slug: c.id, subject: c.subject,
            description: `${c.title} — self-paced recorded course.`, coverImage: '', pricing: c.pricing, type: 'recorded',
            lectures: c.lectures.map((l, i) => ({ id: `${c.id}-l${i + 1}`, description: '', ...l })),
            grade: c.grade, isPublished: true, adminApproval: 'approved', ratings: [], createdAt: now,
        }), { merge: true });
        counts.docs++;
    }
    for (const c of QUIZZES) {
        await db.doc(`quizzes/${c.id}`).set(mock({
            id: c.id, teacherId: c.teacherId, title: c.title, slug: c.id, subject: c.subject,
            description: `${c.title} — timed quiz.`, date: c.date, startTime: c.startTime, durationMinutes: c.durationMinutes,
            pricing: c.pricing, grade: c.grade, status: 'scheduled', isPublished: true,
            questions: c.questions.map((q, qi) => ({ id: `${c.id}-q${qi + 1}`, text: q.text, answers: q.answers.map((a, ai) => ({ id: `${c.id}-q${qi + 1}-a${ai + 1}`, text: a.text, isCorrect: a.isCorrect })) })),
            createdAt: now,
        }), { merge: true });
        counts.docs++;
    }

    // 5) Enrollments + completed sales (drives revenue + student dashboards).
    const enrollPlan = [
        { item: 'mock-cls-phy-theory', type: 'class', field: 'enrolledClassIds', teacher: 'mock-staff-kasun', amount: 2500, students: 8, gateway: 'bank_slip' },
        { item: 'mock-cls-chem-theory', type: 'class', field: 'enrolledClassIds', teacher: 'mock-staff-nisha', amount: 2800, students: 6, gateway: 'manual' },
        { item: 'mock-cls-maths', type: 'class', field: 'enrolledClassIds', teacher: 'mock-staff-ruwan', amount: 3000, students: 5, gateway: 'paypal' },
        { item: 'mock-cls-bio-theory', type: 'class', field: 'enrolledClassIds', teacher: 'mock-staff-dilani', amount: 2600, students: 7, offset: 2, gateway: 'bank_slip' },
        { item: 'mock-crs-mechanics', type: 'course', field: 'enrolledCourseIds', teacher: 'mock-staff-kasun', amount: 7500, students: 4, gateway: 'paypal' },
        { item: 'mock-crs-organic', type: 'course', field: 'enrolledCourseIds', teacher: 'mock-staff-nisha', amount: 8000, students: 4, offset: 1, gateway: 'bank_slip' },
        { item: 'mock-qz-chem', type: 'quiz', field: 'enrolledQuizIds', teacher: 'mock-staff-nisha', amount: 500, students: 5, gateway: 'manual' },
    ];
    const titleOf = { ...Object.fromEntries(CLASSES.map((c) => [c.id, c.title])), ...Object.fromEntries(COURSES.map((c) => [c.id, c.title])), ...Object.fromEntries(QUIZZES.map((c) => [c.id, c.title])) };
    const enrollAdd = {}; // uid -> {field -> [ids]}
    for (const p of enrollPlan) {
        const chosen = students.slice(p.offset ?? 0, (p.offset ?? 0) + p.students);
        const rate = rateOf[p.teacher];
        for (const st of chosen) {
            const teacherComm = round((p.amount * rate) / 100);
            const saleId = `mock-INV-${p.item}-${st.uid.slice(0, 6)}`;
            await db.doc(`sales/${saleId}`).set(mock({
                id: saleId, studentId: st.uid, teacherId: p.teacher, itemId: p.item, itemType: p.type, itemName: titleOf[p.item],
                saleDate: now, completedAt: now, status: 'completed', gateway: p.gateway,
                paymentMethod: p.gateway === 'manual' ? 'manual_at_venue' : p.gateway === 'bank_slip' ? 'bank_transfer' : 'gateway',
                currency: 'LKR', amount: p.amount, baseAmount: p.amount, fxRate: 1,
                teacherCommission: teacherComm, instituteIncome: round(p.amount - teacherComm), commissionRateApplied: rate,
                studentSnapshot: { name: `${st.firstName} ${st.lastName}`, studentId: st.uid, email: st.email },
            }), { merge: true });
            staffEarned[p.teacher] += teacherComm;
            (enrollAdd[st.uid] ??= {});
            (enrollAdd[st.uid][p.field] ??= []).push(p.item);
            counts.sales++;
        }
    }
    // Free enrollments (no sale): everyone into the free seminar + free courses.
    for (const st of students.slice(0, 12)) (enrollAdd[st.uid] ??= {}), ((enrollAdd[st.uid].enrolledClassIds ??= []).push('mock-cls-chem-free'));
    for (const st of students.slice(0, 10)) (enrollAdd[st.uid] ??= {}), ((enrollAdd[st.uid].enrolledCourseIds ??= []).push('mock-crs-genetics'));

    const { FieldValue } = await import('firebase-admin/firestore');
    for (const [studentUid, fields] of Object.entries(enrollAdd)) {
        const update = {};
        for (const [f, ids] of Object.entries(fields)) update[f] = FieldValue.arrayUnion(...ids);
        await db.doc(`users/${studentUid}`).set(update, { merge: true });
    }

    // 6) Staff earnings + a little cash-at-venue balance.
    const manual = { 'mock-staff-kasun': 1500, 'mock-staff-dilani': 800 };
    for (const s of STAFF) {
        await db.doc(`staff/${s.id}`).set({ totalEarned: round(staffEarned[s.id]), manualBalance: manual[s.id] ?? 0 }, { merge: true });
    }

    // 7) Exam results on flagged classes (score cards).
    for (const c of CLASSES.filter((x) => x.withExam)) {
        const enrolled = students.filter((st) => (enrollAdd[st.uid]?.enrolledClassIds ?? []).includes(c.id));
        const exam = {
            id: `${c.id}-ex1`, name: 'June Model Paper', category: 'Model Papers', date: '2026-06-20', maxMark: 100,
            studentScores: enrolled.map((st, i) => ({ studentId: st.uid, score: 55 + ((i * 7) % 40) })), createdAt: now,
        };
        await db.doc(`classes/${c.id}`).set({ examResults: [exam], examCategories: ['Model Papers'] }, { merge: true });
    }

    // 8) Attendance for one Physics session.
    for (const st of students.slice(0, 5)) {
        const id = `mock-cls-phy-theory_2026-06-29_${st.uid}`;
        await db.doc(`attendance/${id}`).set(mock({
            id, classId: 'mock-cls-phy-theory', classTitle: '2026 A/L Physics — Theory', sessionDate: '2026-06-29',
            studentId: st.uid, studentName: `${st.firstName} ${st.lastName}`, studentAvatar: '', teacherId: 'mock-staff-kasun',
            attendedAt: now, paymentStatus: 'paid', markedBy: 'mock-seed',
        }), { merge: true });
        counts.docs++;
    }

    // 9) Quiz submissions (score cards) + certificates.
    for (const st of students.slice(0, 6)) {
        const sid = `mock-qz-physics_${st.uid}`;
        await db.doc(`submissions/${sid}`).set(mock({ id: sid, studentId: st.uid, quizId: 'mock-qz-physics', quizTitle: 'Physics MCQ — Mechanics', teacherId: 'mock-staff-kasun', score: 3 + (st.uid.charCodeAt(0) % 3), total: 5, submittedAt: now }), { merge: true });
    }
    for (const st of students.slice(0, 2)) {
        const cid = `mock-crs-mechanics_${st.uid}`;
        const vid = `LJC-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        await db.doc(`certificates/${cid}`).set(mock({ id: cid, studentId: st.uid, studentName: `${st.firstName} ${st.lastName}`, teacherId: 'mock-staff-kasun', teacherName: 'Kasun Bandara', itemId: 'mock-crs-mechanics', itemType: 'course', itemTitle: 'Mechanics Masterclass', issuedAt: now, issuedBy: 'mock-seed', pdfUrl: '', verificationId: vid }), { merge: true });
    }

    console.log(`\n✔ Mock seed complete: ${counts.users} users, ${counts.sales} sales, ${counts.docs}+ content docs.`);
    console.log(`  Password for ALL mock logins: ${MOCK_PASSWORD}`);
}

run().then(() => process.exit(0)).catch((e) => { console.error('SEED FAILED:', e); process.exit(1); });
