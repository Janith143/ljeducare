'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { Course, Lecture } from '@ljeducare/shared';
import { COLLECTIONS, slugify } from '@ljeducare/shared';
import { requireRole, type SessionUser } from '@/lib/auth/session';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

export interface CourseFormInput {
    id?: string;
    title: string;
    subject: string;
    description: string;
    basePrice: number;
    usdOverride?: number | null;
    isFree: boolean;
    medium?: string;
    grade?: string;
    category?: string;
    lectures: {
        id?: string;
        title: string;
        videoUrl: string;
        durationMinutes: number;
        isFreePreview: boolean;
    }[];
}

async function authorize(user: SessionUser, existingId?: string) {
    const staff = await getOwnStaffProfile(user);
    const staffId = staff?.id ?? null;
    const db = adminDb();
    if (existingId) {
        const doc = await db.collection(COLLECTIONS.COURSES).doc(existingId).get();
        if (!doc.exists) throw new Error('Course not found.');
        if (user.role !== 'teacher_admin' && doc.data()!.teacherId !== staffId) {
            throw new Error('Not your course.');
        }
        return { db, staffId, existing: { ...(doc.data() as Course), id: doc.id } };
    }
    if (user.role !== 'teacher_admin' && !staffId) {
        throw new Error('No staff profile linked to your account — ask an admin.');
    }
    return { db, staffId, existing: null };
}

export async function saveCourseAction(input: CourseFormInput) {
    const user = await requireRole('teacher', 'teacher_admin');
    if (!input.title.trim()) return { error: 'Title is required.' };
    if (!input.subject.trim()) return { error: 'Subject is required.' };
    if (!input.isFree && !(input.basePrice > 0)) return { error: 'Price must be positive (or mark as free).' };
    if (!input.lectures.length) return { error: 'Add at least one lesson.' };
    for (const l of input.lectures) {
        if (!l.title.trim()) return { error: 'Every lesson needs a title.' };
    }

    try {
        const { db, staffId, existing } = await authorize(user, input.id);

        const lectures: Lecture[] = input.lectures.map((l, i) => ({
            id: l.id || `lec-${i + 1}-${Math.random().toString(36).slice(2, 6)}`,
            title: l.title.trim(),
            description: '',
            videoUrl: l.videoUrl.trim(),
            durationMinutes: Math.max(0, Number(l.durationMinutes) || 0),
            isFreePreview: !!l.isFreePreview,
        }));

        const pricing = input.isFree
            ? { basePrice: 0, isFree: true }
            : {
                  basePrice: Math.round(input.basePrice * 100) / 100,
                  ...(input.usdOverride && input.usdOverride > 0
                      ? { overrides: { USD: Math.round(input.usdOverride * 100) / 100 } }
                      : {}),
              };

        const fields = {
            title: input.title.trim(),
            subject: input.subject.trim(),
            description: input.description.trim(),
            pricing,
            lectures,
            medium: input.medium?.trim() || '',
            grade: input.grade?.trim() || '',
            category: input.category?.trim() || '',
        };

        if (existing) {
            await db.collection(COLLECTIONS.COURSES).doc(existing.id).update(fields);
        } else {
            const ref = db.collection(COLLECTIONS.COURSES).doc();
            await ref.set({
                ...fields,
                id: ref.id,
                slug: slugify(input.title),
                teacherId: staffId,
                coverImage: '',
                type: 'recorded',
                isPublished: false,
                adminApproval: 'not_requested',
                ratings: [],
                createdAt: new Date().toISOString(),
            });
        }

        revalidateTag('courses');
        revalidatePath('/teacher/courses');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

export async function togglePublishCourseAction(courseId: string, publish: boolean) {
    const user = await requireRole('teacher', 'teacher_admin');
    try {
        const { db } = await authorize(user, courseId);
        await db.collection(COLLECTIONS.COURSES).doc(courseId).update({ isPublished: publish });
        revalidateTag('courses');
        revalidatePath('/teacher/courses');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

export async function deleteCourseAction(courseId: string) {
    const user = await requireRole('teacher', 'teacher_admin');
    try {
        const { db } = await authorize(user, courseId);
        await db.collection(COLLECTIONS.COURSES).doc(courseId).update({
            isDeleted: true,
            isPublished: false,
            deletedAt: new Date().toISOString(),
            deletedBy: user.uid,
        });
        revalidateTag('courses');
        revalidatePath('/teacher/courses');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}
