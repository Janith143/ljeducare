#!/usr/bin/env node
/**
 * Seed the Firebase emulators with demo data: one user per role, currency settings,
 * two staff members, sample classes/courses/quizzes.
 *
 * Run with emulators up:
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *     GCLOUD_PROJECT=ljeducare-CHANGE_ME node scripts/seed-emulator.mjs
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
    console.error('Refusing to run: set FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST (emulators only).');
    process.exit(1);
}

initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'ljeducare-CHANGE_ME' });
const auth = getAuth();
const db = getFirestore();
const now = new Date().toISOString();

const USERS = [
    { email: 'admin@lj.test', password: 'password123', role: 'main_admin', firstName: 'Main', lastName: 'Admin' },
    { email: 'manager@lj.test', password: 'password123', role: 'manager', firstName: 'Maya', lastName: 'Manager' },
    { email: 'teacheradmin@lj.test', password: 'password123', role: 'teacher_admin', firstName: 'Tara', lastName: 'TeacherAdmin' },
    { email: 'teacher@lj.test', password: 'password123', role: 'teacher', firstName: 'Tharindu', lastName: 'Perera', staffId: 'staff-tharindu' },
    { email: 'student@lj.test', password: 'password123', role: 'student', firstName: 'Sasindu', lastName: 'Silva' },
    { email: 'kiosk@lj.test', password: 'password123', role: 'kiosk', firstName: 'Front', lastName: 'Desk' },
];

for (const u of USERS) {
    let record;
    try {
        record = await auth.getUserByEmail(u.email);
    } catch {
        record = await auth.createUser({ email: u.email, password: u.password, displayName: `${u.firstName} ${u.lastName}` });
    }
    await auth.setCustomUserClaims(record.uid, { role: u.role });
    await db.doc(`users/${record.uid}`).set({
        id: record.uid,
        uid: record.uid,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        avatar: '',
        status: 'active',
        preferredCurrency: 'LKR',
        ...(u.staffId ? { staffId: u.staffId } : {}),
        createdAt: now,
    }, { merge: true });
    console.log(`✔ user ${u.email} (${u.role})`);
}

await db.doc('settings/currencies').set({
    base: 'LKR',
    enabled: ['LKR', 'USD', 'GBP', 'AUD'],
    rates: {
        USD: { rate: 0.0031, updatedAt: now },
        GBP: { rate: 0.0024, updatedAt: now },
        AUD: { rate: 0.0047, updatedAt: now },
    },
    ratesUpdatedBy: 'seed',
});
console.log('✔ settings/currencies');

const teacherUid = (await auth.getUserByEmail('teacher@lj.test')).uid;
await db.doc('staff/staff-tharindu').set({
    id: 'staff-tharindu',
    userId: teacherUid,
    name: 'Tharindu Perera',
    slug: 'tharindu-perera',
    email: 'teacher@lj.test',
    profileImage: '',
    avatar: '',
    tagline: 'Physics made simple',
    bio: 'Senior Physics teacher at LJ Educare with 10+ years of experience.',
    subjects: ['Physics'],
    commissionRate: 40,
    manualBalance: 0,
    totalEarned: 0,
    isPublished: true,
    createdAt: now,
});
console.log('✔ staff/staff-tharindu');

await db.doc('classes/cls-physics-2026').set({
    id: 'cls-physics-2026',
    teacherId: 'staff-tharindu',
    title: '2026 A/L Physics Theory',
    slug: 'al-physics-theory-2026',
    subject: 'Physics',
    description: 'Weekly A/L Physics theory class covering the full syllabus.',
    date: '2026-07-06',
    startTime: '16:00',
    endTime: '18:00',
    pricing: { basePrice: 2500, overrides: { USD: 9.99 } },
    targetAudience: 'A/L 2026',
    mode: 'Both',
    recurrence: 'weekly',
    weeklyPaymentOption: 'per_month',
    status: 'scheduled',
    isPublished: true,
    adminApproval: 'approved',
    medium: 'Sinhala',
    grade: 'A/L',
    createdAt: now,
});
console.log('✔ classes/cls-physics-2026');

await db.doc('classes/cls-free-seminar').set({
    id: 'cls-free-seminar',
    teacherId: 'staff-tharindu',
    title: 'Free Physics Seminar',
    slug: 'free-physics-seminar',
    subject: 'Physics',
    description: 'Open seminar — how to tackle the 2026 A/L Physics paper.',
    date: '2026-07-10',
    startTime: '10:00',
    endTime: '12:00',
    pricing: { basePrice: 0, isFree: true },
    targetAudience: 'A/L 2026',
    mode: 'Online',
    recurrence: 'none',
    status: 'scheduled',
    isPublished: true,
    adminApproval: 'approved',
    medium: 'Sinhala',
    grade: 'A/L',
    createdAt: now,
});
console.log('✔ classes/cls-free-seminar');

await db.doc('courses/crs-mechanics').set({
    id: 'crs-mechanics',
    teacherId: 'staff-tharindu',
    title: 'Mechanics Masterclass (Recorded)',
    slug: 'mechanics-masterclass',
    description: 'Complete recorded unit on Mechanics with worked examples.',
    subject: 'Physics',
    coverImage: '',
    pricing: { basePrice: 7500, overrides: { USD: 24.99 } },
    type: 'recorded',
    lectures: [
        { id: 'l1', title: 'Kinematics', description: '', videoUrl: '', durationMinutes: 45, isFreePreview: true },
        { id: 'l2', title: 'Newton\'s Laws', description: '', videoUrl: '', durationMinutes: 50, isFreePreview: false },
    ],
    isPublished: true,
    adminApproval: 'approved',
    ratings: [],
    createdAt: now,
});
console.log('✔ courses/crs-mechanics');

console.log('\nSeed complete. Logins: *@lj.test / password123');
