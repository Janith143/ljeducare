/**
 * Seed storefront demo data into the LOCAL EMULATOR so the dev preview renders the
 * institute portal populated (categories → teachers → content). Admin SDK against the
 * emulator bypasses rules; no credentials needed. Temporary/dev-only.
 * Run:  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/seed-emulator-storefront.mjs
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
initializeApp({ projectId: 'demo-ljeducare' });
const db = getFirestore();

const CATS = [
    { slug: 'mathematics', name: 'Mathematics' },
    { slug: 'science', name: 'Science' },
    { slug: 'english', name: 'English' },
    { slug: 'ict', name: 'ICT' },
    { slug: 'commerce', name: 'Commerce' },
];
const face = (n) => `https://i.pravatar.cc/300?img=${n}`;
const cover = (s) => `https://picsum.photos/seed/lje-${s}/640/360`;
const catImg = (s) => `https://picsum.photos/seed/ljecat-${s}/640/420`;

const TEACHERS = [
    { id: 'demo-t1', name: 'Nimal Perera', subject: 'Mathematics', cat: 'mathematics', img: 12 },
    { id: 'demo-t2', name: 'Sanduni Silva', subject: 'Physics', cat: 'science', img: 5 },
    { id: 'demo-t3', name: 'Ashan Fernando', subject: 'English', cat: 'english', img: 33 },
    { id: 'demo-t4', name: 'Kavindi Jayasuriya', subject: 'ICT', cat: 'ict', img: 47 },
    { id: 'demo-t5', name: 'Ruwan Bandara', subject: 'Accounting', cat: 'commerce', img: 60 },
    { id: 'demo-t6', name: 'Dinusha Wickrama', subject: 'Chemistry', cat: 'science', img: 24 },
];

async function run() {
    for (let i = 0; i < CATS.length; i++) {
        const c = CATS[i];
        await db.collection('categories').doc(c.slug).set({
            id: c.slug, name: c.name, slug: c.slug, description: `${c.name} at our institute.`,
            image: catImg(c.slug), order: i, enabled: true, featured: true, createdAt: new Date().toISOString(), mock: true,
        });
    }
    for (const t of TEACHERS) {
        await db.collection('staff').doc(t.id).set({
            id: t.id, name: t.name, slug: t.id, email: `${t.id}@demo.lje`, profileImage: face(t.img), avatar: face(t.img),
            tagline: `${t.subject} teacher`, bio: '', subjects: [t.subject], commissionRate: 70, isPublished: true, isDeleted: false, mock: true,
        });
        const cat = CATS.find((c) => c.slug === t.cat);
        await db.collection('courses').doc(`${t.id}-course`).set({
            id: `${t.id}-course`, teacherId: t.id, title: `${t.subject} Master Course`, slug: `${t.id}-course`, subject: t.subject,
            description: '', coverImage: cover(`${t.id}c`), pricing: { basePrice: 2500 }, type: 'recorded', lectures: [], ratings: [],
            isPublished: true, adminApproval: 'approved', isDeleted: false, category: cat.name, categorySlug: cat.slug,
            createdAt: new Date().toISOString(), mock: true,
        });
        await db.collection('classes').doc(`${t.id}-class`).set({
            id: `${t.id}-class`, teacherId: t.id, title: `${t.subject} Theory Class`, slug: `${t.id}-class`, subject: t.subject,
            description: '', date: '2026-08-01', startTime: '16:00', endTime: '18:00', pricing: { basePrice: 1500 }, mode: 'Online',
            targetAudience: 'A/L 2026', recurrence: 'weekly', status: 'scheduled', isPublished: true, adminApproval: 'approved',
            isDeleted: false, category: cat.name, categorySlug: cat.slug, createdAt: new Date().toISOString(), mock: true,
        });
    }
    console.log(`Seeded ${CATS.length} categories, ${TEACHERS.length} teachers + their courses/classes into the emulator.`);
}
run().catch((e) => { console.error(e); process.exit(1); });
