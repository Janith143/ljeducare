import 'server-only';

import { unstable_cache } from 'next/cache';
import type { Course, LiveClass, Quiz, StaffMember } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { adminDb } from '@/lib/firebase/admin';

/** Cache tags used by /api/revalidate (database-triggers posts here on writes). */
export const CACHE_TAGS = {
    classes: 'classes',
    courses: 'courses',
    quizzes: 'quizzes',
    teachers: 'teachers',
} as const;

function stripPrivateClassFields(cls: LiveClass): LiveClass {
    // Never leak enrolled-only fields into public/ISR payloads.
    const { simulatedVideoUrl, joiningLink, zoomStartUrl, recordingUrls, attendance, grades, ...pub } =
        cls;
    void simulatedVideoUrl; void joiningLink; void zoomStartUrl; void recordingUrls; void attendance; void grades;
    return pub as LiveClass;
}

export const listPublishedClasses = unstable_cache(
    async (): Promise<LiveClass[]> => {
        const snap = await adminDb()
            .collection(COLLECTIONS.CLASSES)
            .where('isPublished', '==', true)
            .get();
        return snap.docs
            .map((d) => ({ ...(d.data() as LiveClass), id: d.id }))
            .filter((c) => !c.isDeleted && c.status === 'scheduled')
            .map(stripPrivateClassFields)
            .sort((a, b) => a.date.localeCompare(b.date));
    },
    ['published-classes'],
    { revalidate: 60, tags: [CACHE_TAGS.classes] },
);

export async function getClassBySlug(slug: string): Promise<LiveClass | null> {
    const all = await listPublishedClasses();
    return all.find((c) => c.slug === slug) ?? null;
}

export const listPublishedCourses = unstable_cache(
    async (): Promise<Course[]> => {
        const snap = await adminDb()
            .collection(COLLECTIONS.COURSES)
            .where('isPublished', '==', true)
            .get();
        return snap.docs
            .map((d) => ({ ...(d.data() as Course), id: d.id }))
            .filter((c) => !c.isDeleted)
            .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    },
    ['published-courses'],
    { revalidate: 60, tags: [CACHE_TAGS.courses] },
);

export async function getCourseBySlug(slug: string): Promise<Course | null> {
    const all = await listPublishedCourses();
    return all.find((c) => c.slug === slug) ?? null;
}

export const listPublishedQuizzes = unstable_cache(
    async (): Promise<Quiz[]> => {
        const snap = await adminDb()
            .collection(COLLECTIONS.QUIZZES)
            .where('isPublished', '==', true)
            .get();
        return snap.docs
            .map((d) => ({ ...(d.data() as Quiz), id: d.id }))
            // Questions (with answers!) must never reach public payloads.
            .map((q) => ({ ...q, questions: [] }))
            .filter((q) => !q.isDeleted && q.status === 'scheduled')
            .sort((a, b) => a.date.localeCompare(b.date));
    },
    ['published-quizzes'],
    { revalidate: 60, tags: [CACHE_TAGS.quizzes] },
);

export const listPublishedTeachers = unstable_cache(
    async (): Promise<StaffMember[]> => {
        const snap = await adminDb()
            .collection(COLLECTIONS.STAFF)
            .where('isPublished', '==', true)
            .get();
        return snap.docs
            .map((d) => ({ ...(d.data() as StaffMember), id: d.id }))
            .filter((s) => !s.isDeleted)
            // Money fields are institute-internal.
            .map(({ commissionRate, manualBalance, totalEarned, lastReset, ...pub }) => {
                void commissionRate; void manualBalance; void totalEarned; void lastReset;
                return pub as StaffMember;
            });
    },
    ['published-teachers'],
    { revalidate: 300, tags: [CACHE_TAGS.teachers] },
);

export async function getTeacherBySlug(slug: string): Promise<StaffMember | null> {
    const all = await listPublishedTeachers();
    return all.find((t) => t.slug === slug) ?? null;
}
