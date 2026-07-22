'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { Course, Lecture } from '@ljeducare/shared';
import { COLLECTIONS, approvalOf, canPublish, canSubmit, slugify } from '@ljeducare/shared';
import { requireRole, type SessionUser } from '@/lib/auth/session';
import { CONTENT_ROLES, assignsTeacher, autoApproved } from '@/lib/auth/contentRoles';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

export interface CourseFormInput {
    id?: string;
    /** Staff id the course belongs to — required when the creator isn't a teacher. */
    teacherId?: string;
    title: string;
    subject: string;
    description: string;
    basePrice: number;
    usdOverride?: number | null;
    isFree: boolean;
    medium?: string;
    grade?: string;
    category?: string;
    categorySlug?: string;
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
    // teacher_admin / main_admin / manager oversee everyone's content; a plain teacher
    // is limited to their own.
    const managesAll = assignsTeacher(user.role);
    if (existingId) {
        const doc = await db.collection(COLLECTIONS.COURSES).doc(existingId).get();
        if (!doc.exists) throw new Error('Course not found.');
        if (!managesAll && doc.data()!.teacherId !== staffId) {
            throw new Error('Not your course.');
        }
        return { db, staffId, existing: { ...(doc.data() as Course), id: doc.id } };
    }
    if (!managesAll && !staffId) {
        throw new Error('No staff profile linked to your account — ask an admin.');
    }
    return { db, staffId, existing: null };
}

export async function saveCourseAction(input: CourseFormInput) {
    const user = await requireRole(...CONTENT_ROLES);
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
            categorySlug: input.categorySlug?.trim() || '',
        };

        if (existing) {
            // Admins/managers may also reassign an existing course to another teacher.
            const reassign = assignsTeacher(user.role) && input.teacherId ? { teacherId: input.teacherId } : {};
            await db.collection(COLLECTIONS.COURSES).doc(existing.id).update({ ...fields, ...reassign });
        } else {
            // A plain teacher owns what they create; anyone else must nominate a teacher,
            // otherwise the course would be orphaned (no byline, outside the cascade).
            const owner = assignsTeacher(user.role) ? (input.teacherId ?? '').trim() : staffId;
            if (!owner) throw new Error('Choose the teacher this course belongs to.');

            const ref = db.collection(COLLECTIONS.COURSES).doc();
            await ref.set({
                ...fields,
                id: ref.id,
                slug: slugify(input.title),
                teacherId: owner,
                coverImage: '',
                type: 'recorded',
                isPublished: false,
                adminApproval: autoApproved(user.role) ? 'approved' : 'not_requested',
                ...(autoApproved(user.role)
                    ? { approvedAt: new Date().toISOString(), approvedBy: user.uid }
                    : {}),
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
    const user = await requireRole(...CONTENT_ROLES);
    try {
        const { db } = await authorize(user, courseId);
        const ref = db.collection(COLLECTIONS.COURSES).doc(courseId);

        // Going live needs admin approval. Unpublishing is always allowed, so a
        // teacher can pull their own course down without waiting for anyone.
        if (publish) {
            const snap = await ref.get();
            if (!canPublish(snap.data()?.adminApproval)) {
                return { error: 'This course needs admin approval before it can go live.' };
            }
        }

        await ref.update({ isPublished: publish });
        revalidateTag('courses');
        revalidatePath('/teacher/courses');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

/** Teacher asks an admin to review the course (draft/rejected → pending). */
export async function submitCourseForApprovalAction(courseId: string) {
    const user = await requireRole(...CONTENT_ROLES);
    try {
        const { db } = await authorize(user, courseId);
        const ref = db.collection(COLLECTIONS.COURSES).doc(courseId);
        const snap = await ref.get();
        if (!snap.exists) return { error: 'Course not found.' };
        if (!canSubmit(snap.data()?.adminApproval)) {
            return { error: 'This course is already submitted or approved.' };
        }
        await ref.update({
            adminApproval: 'pending',
            submittedForApprovalAt: new Date().toISOString(),
            approvalNote: null,
        });
        revalidatePath('/teacher/courses');
        revalidatePath('/admin/content');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

/** Teacher pulls a pending request back to draft. */
export async function withdrawCourseApprovalAction(courseId: string) {
    const user = await requireRole(...CONTENT_ROLES);
    try {
        const { db } = await authorize(user, courseId);
        const ref = db.collection(COLLECTIONS.COURSES).doc(courseId);
        if (approvalOf((await ref.get()).data()?.adminApproval) !== 'pending') {
            return { error: 'Only a pending request can be withdrawn.' };
        }
        await ref.update({ adminApproval: 'not_requested' });
        revalidatePath('/teacher/courses');
        revalidatePath('/admin/content');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

export async function deleteCourseAction(courseId: string) {
    const user = await requireRole(...CONTENT_ROLES);
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
