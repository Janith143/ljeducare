/**
 * Mock dataset definitions for LJ Educare (see seed-mock-data.mjs).
 * ALL generated records are tagged `mock: true` and all logins use the
 * `@ljeducare.demo` domain so remove-mock-data.mjs can delete them exactly.
 */
export const MOCK_PASSWORD = 'Demo@1234';
export const MOCK_DOMAIN = 'ljeducare.demo';

/** Staff (teacher) profiles. userEmail links to the auth/user account. */
export const STAFF = [
    { id: 'mock-staff-kasun', email: `kasun@${MOCK_DOMAIN}`, name: 'Kasun Bandara', subjects: ['Physics'], commissionRate: 40, tagline: 'A/L Physics made intuitive', experienceYears: 12 },
    { id: 'mock-staff-nisha', email: `nisha@${MOCK_DOMAIN}`, name: 'Nisha Fernando', subjects: ['Chemistry'], commissionRate: 45, tagline: 'Organic chemistry, simplified', experienceYears: 9 },
    { id: 'mock-staff-ruwan', email: `ruwan@${MOCK_DOMAIN}`, name: 'Ruwan Jayasuriya', subjects: ['Combined Maths'], commissionRate: 40, tagline: 'Master maths with practice', experienceYears: 15 },
    { id: 'mock-staff-dilani', email: `dilani@${MOCK_DOMAIN}`, name: 'Dilani Perera', subjects: ['Biology'], commissionRate: 50, tagline: 'Biology for future doctors', experienceYears: 7 },
];

/** Auth users + role. Teachers reference their staffId. */
export const USERS = [
    { email: `admin@${MOCK_DOMAIN}`, role: 'main_admin', firstName: 'Amara', lastName: 'Admin' },
    { email: `manager@${MOCK_DOMAIN}`, role: 'manager', firstName: 'Manoj', lastName: 'Manager' },
    { email: `teacheradmin@${MOCK_DOMAIN}`, role: 'teacher_admin', firstName: 'Tania', lastName: 'Rathnayake' },
    ...STAFF.map((s) => ({
        email: s.email,
        role: 'teacher',
        firstName: s.name.split(' ')[0],
        lastName: s.name.split(' ').slice(1).join(' '),
        staffId: s.id,
    })),
    ...Array.from({ length: 14 }, (_, i) => {
        const first = ['Sasindu', 'Nimal', 'Kamala', 'Ishara', 'Tharindu', 'Oshadha', 'Hiruni', 'Kavindu', 'Sanduni', 'Praveen', 'Malsha', 'Yasas', 'Dinithi', 'Ravindu'][i];
        return { email: `student${i + 1}@${MOCK_DOMAIN}`, role: 'student', firstName: first, lastName: `Student${i + 1}`, guardianPhone: `07${(70000000 + i * 137).toString().slice(0, 8)}`, guardianEmail: `guardian${i + 1}@${MOCK_DOMAIN}` };
    }),
];

const price = (basePrice, usd) => ({ basePrice, ...(usd ? { overrides: { USD: usd } } : {}) });

/** Live classes. */
export const CLASSES = [
    { id: 'mock-cls-phy-theory', teacherId: 'mock-staff-kasun', title: '2026 A/L Physics — Theory', subject: 'Physics', targetAudience: 'A/L 2026', medium: 'Sinhala', grade: 'A/L', mode: 'Both', recurrence: 'weekly', weeklyPaymentOption: 'per_month', pricing: price(2500, 9.99), date: '2026-07-06', startTime: '16:00', endTime: '18:00', recordingMaxViews: 3, recordings: { '2026-06-29': ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'] }, withExam: true },
    { id: 'mock-cls-phy-rev', teacherId: 'mock-staff-kasun', title: 'Physics Revision — Past Papers', subject: 'Physics', targetAudience: 'A/L 2026', medium: 'English', grade: 'A/L', mode: 'Online', recurrence: 'weekly', weeklyPaymentOption: 'per_session', pricing: price(1500), date: '2026-07-07', startTime: '18:30', endTime: '20:00' },
    { id: 'mock-cls-chem-theory', teacherId: 'mock-staff-nisha', title: '2026 A/L Chemistry — Theory', subject: 'Chemistry', targetAudience: 'A/L 2026', medium: 'Sinhala', grade: 'A/L', mode: 'Both', recurrence: 'weekly', weeklyPaymentOption: 'per_month', pricing: price(2800, 10.99), date: '2026-07-06', startTime: '14:00', endTime: '16:00', withExam: true },
    { id: 'mock-cls-chem-free', teacherId: 'mock-staff-nisha', title: 'Free Chemistry Seminar — Exam Tips', subject: 'Chemistry', targetAudience: 'A/L 2026', medium: 'Sinhala', grade: 'A/L', mode: 'Online', recurrence: 'none', pricing: { basePrice: 0, isFree: true }, date: '2026-07-12', startTime: '10:00', endTime: '12:00' },
    { id: 'mock-cls-maths', teacherId: 'mock-staff-ruwan', title: '2026 A/L Combined Maths', subject: 'Combined Maths', targetAudience: 'A/L 2026', medium: 'English', grade: 'A/L', mode: 'Both', recurrence: 'weekly', weeklyPaymentOption: 'per_month', pricing: price(3000, 11.99), date: '2026-07-05', startTime: '08:00', endTime: '11:00' },
    { id: 'mock-cls-maths-paper', teacherId: 'mock-staff-ruwan', title: 'Maths Paper Class', subject: 'Combined Maths', targetAudience: 'A/L 2026', medium: 'Sinhala', grade: 'A/L', mode: 'Online', recurrence: 'weekly', weeklyPaymentOption: 'per_session', pricing: price(2000), date: '2026-07-09', startTime: '17:00', endTime: '19:00' },
    { id: 'mock-cls-bio-theory', teacherId: 'mock-staff-dilani', title: '2026 A/L Biology — Theory', subject: 'Biology', targetAudience: 'A/L 2026', medium: 'Sinhala', grade: 'A/L', mode: 'Both', recurrence: 'weekly', weeklyPaymentOption: 'per_month', pricing: price(2600, 9.49), date: '2026-07-06', startTime: '10:00', endTime: '12:30' },
    { id: 'mock-cls-bio-prac', teacherId: 'mock-staff-dilani', title: 'Biology Practical Session', subject: 'Biology', targetAudience: 'A/L 2026', medium: 'English', grade: 'A/L', mode: 'Physical', recurrence: 'none', pricing: price(3500, 12.99), date: '2026-07-14', startTime: '09:00', endTime: '13:00' },
];

const lec = (title, min, free = false) => ({ title, videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', durationMinutes: min, isFreePreview: free });

/** Recorded courses. */
export const COURSES = [
    { id: 'mock-crs-mechanics', teacherId: 'mock-staff-kasun', title: 'Mechanics Masterclass', subject: 'Physics', grade: 'A/L', pricing: price(7500, 24.99), lectures: [lec('Kinematics', 45, true), lec("Newton's Laws", 50), lec('Work & Energy', 48), lec('Momentum', 40)] },
    { id: 'mock-crs-organic', teacherId: 'mock-staff-nisha', title: 'Organic Chemistry Deep Dive', subject: 'Chemistry', grade: 'A/L', pricing: price(8000, 26.99), lectures: [lec('Hydrocarbons', 55, true), lec('Functional Groups', 60), lec('Reaction Mechanisms', 65)] },
    { id: 'mock-crs-calculus', teacherId: 'mock-staff-ruwan', title: 'Calculus Foundations', subject: 'Combined Maths', grade: 'A/L', pricing: price(6500, 21.99), lectures: [lec('Limits', 40, true), lec('Differentiation', 50), lec('Integration', 55), lec('Applications', 45), lec('Past Papers', 60)] },
    { id: 'mock-crs-genetics', teacherId: 'mock-staff-dilani', title: 'Genetics Explained (Free)', subject: 'Biology', grade: 'A/L', pricing: { basePrice: 0, isFree: true }, lectures: [lec('DNA & Genes', 35, true), lec('Inheritance', 40, true), lec('Mutations', 30, true)] },
];

const q = (text, opts, correct) => ({ text, answers: opts.map((t, i) => ({ text: t, isCorrect: i === correct })) });

/** Quizzes with questions. */
export const QUIZZES = [
    { id: 'mock-qz-physics', teacherId: 'mock-staff-kasun', title: 'Physics MCQ — Mechanics', subject: 'Physics', grade: 'A/L', pricing: { basePrice: 0, isFree: true }, durationMinutes: 15, date: '2026-07-08', startTime: '20:00', questions: [q('SI unit of force?', ['Joule', 'Newton', 'Watt', 'Pascal'], 1), q('Acceleration due to gravity (m/s²)?', ['9.8', '8.9', '10.8', '6.7'], 0), q('Momentum = ?', ['mv', 'ma', 'mgh', 'm/v'], 0), q('Work has the same unit as?', ['Power', 'Energy', 'Force', 'Momentum'], 1), q('A vector has?', ['Only magnitude', 'Magnitude and direction', 'Only direction', 'Neither'], 1)] },
    { id: 'mock-qz-chem', teacherId: 'mock-staff-nisha', title: 'Chemistry Quiz — Organic', subject: 'Chemistry', grade: 'A/L', pricing: price(500), durationMinutes: 20, date: '2026-07-10', startTime: '19:00', questions: [q('Simplest alkane?', ['Ethane', 'Methane', 'Propane', 'Butane'], 1), q('Functional group of alcohols?', ['-COOH', '-OH', '-CHO', '-NH2'], 1), q('Benzene has how many carbons?', ['5', '6', '7', '8'], 1), q('Alkenes contain a?', ['Single bond', 'Double bond', 'Triple bond', 'Ionic bond'], 1), q('-COOH is a?', ['Ketone', 'Aldehyde', 'Carboxylic acid', 'Ester'], 2)] },
    { id: 'mock-qz-maths', teacherId: 'mock-staff-ruwan', title: 'Maths Speed Test', subject: 'Combined Maths', grade: 'A/L', pricing: { basePrice: 0, isFree: true }, durationMinutes: 10, date: '2026-07-11', startTime: '21:00', questions: [q('d/dx of x²?', ['x', '2x', 'x³/3', '2'], 1), q('∫ 1 dx = ?', ['0', 'x + C', '1', 'x²'], 1), q('sin(0) = ?', ['1', '0', '-1', '0.5'], 1), q('Value of e (approx)?', ['2.71', '3.14', '1.61', '1.41'], 0)] },
    { id: 'mock-qz-bio', teacherId: 'mock-staff-dilani', title: 'Biology Basics', subject: 'Biology', grade: 'A/L', pricing: { basePrice: 0, isFree: true }, durationMinutes: 12, date: '2026-07-13', startTime: '20:30', questions: [q('Powerhouse of the cell?', ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi'], 1), q('DNA base that pairs with A?', ['G', 'C', 'T', 'U'], 2), q('Photosynthesis occurs in?', ['Mitochondria', 'Chloroplast', 'Nucleus', 'Vacuole'], 1), q('Humans have how many chromosomes?', ['23', '46', '48', '44'], 1), q('Insulin is produced by?', ['Liver', 'Pancreas', 'Kidney', 'Stomach'], 1)] },
];
