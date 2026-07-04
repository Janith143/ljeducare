'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { Question, Quiz } from '@ljeducare/shared';
import { COLLECTIONS, slugify } from '@ljeducare/shared';
import { requireRole, type SessionUser } from '@/lib/auth/session';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

export interface QuizFormInput {
    id?: string;
    title: string;
    subject: string;
    description: string;
    date: string;
    startTime: string;
    durationMinutes: number;
    basePrice: number;
    usdOverride?: number | null;
    isFree: boolean;
    medium?: string;
    grade?: string;
    category?: string;
    categorySlug?: string;
    questions: Question[];
}

async function authorize(user: SessionUser, existingId?: string) {
    const staff = await getOwnStaffProfile(user);
    const staffId = staff?.id ?? null;
    const db = adminDb();
    if (existingId) {
        const doc = await db.collection(COLLECTIONS.QUIZZES).doc(existingId).get();
        if (!doc.exists) throw new Error('Quiz not found.');
        if (user.role !== 'teacher_admin' && doc.data()!.teacherId !== staffId) throw new Error('Not your quiz.');
        return { db, staffId, existing: { ...(doc.data() as Quiz), id: doc.id } };
    }
    if (user.role !== 'teacher_admin' && !staffId) {
        throw new Error('No staff profile linked to your account — ask an admin.');
    }
    return { db, staffId, existing: null };
}

function validate(input: QuizFormInput): string | null {
    if (!input.title.trim()) return 'Title is required.';
    if (!input.subject.trim()) return 'Subject is required.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return 'Valid date is required.';
    if (!/^\d{2}:\d{2}$/.test(input.startTime)) return 'Valid start time is required.';
    if (!(input.durationMinutes > 0)) return 'Duration must be positive.';
    if (!input.isFree && !(input.basePrice > 0)) return 'Price must be positive (or mark as free).';
    if (!input.questions.length) return 'Add at least one question.';
    for (const [i, q] of input.questions.entries()) {
        if (!q.text.trim()) return `Question ${i + 1} needs text.`;
        if ((q.answers?.length ?? 0) < 2) return `Question ${i + 1} needs at least 2 options.`;
        if (!q.answers.some((a) => a.isCorrect)) return `Question ${i + 1} needs a correct option.`;
    }
    return null;
}

export async function saveQuizAction(input: QuizFormInput) {
    const user = await requireRole('teacher', 'teacher_admin');
    const error = validate(input);
    if (error) return { error };

    try {
        const { db, staffId, existing } = await authorize(user, input.id);
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
            date: input.date,
            startTime: input.startTime,
            durationMinutes: Math.round(input.durationMinutes),
            pricing,
            questions: input.questions,
            medium: input.medium?.trim() || '',
            grade: input.grade?.trim() || '',
            category: input.category?.trim() || '',
            categorySlug: input.categorySlug?.trim() || '',
        };

        if (existing) {
            await db.collection(COLLECTIONS.QUIZZES).doc(existing.id).update(fields);
        } else {
            const ref = db.collection(COLLECTIONS.QUIZZES).doc();
            await ref.set({
                ...fields,
                id: ref.id,
                slug: slugify(input.title),
                teacherId: staffId,
                status: 'scheduled',
                isPublished: false,
                createdAt: new Date().toISOString(),
            });
        }
        revalidateTag('quizzes');
        revalidatePath('/teacher/quizzes');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

export async function togglePublishQuizAction(quizId: string, publish: boolean) {
    const user = await requireRole('teacher', 'teacher_admin');
    try {
        const { db } = await authorize(user, quizId);
        await db.collection(COLLECTIONS.QUIZZES).doc(quizId).update({ isPublished: publish });
        revalidateTag('quizzes');
        revalidatePath('/teacher/quizzes');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

export async function deleteQuizAction(quizId: string) {
    const user = await requireRole('teacher', 'teacher_admin');
    try {
        const { db } = await authorize(user, quizId);
        await db.collection(COLLECTIONS.QUIZZES).doc(quizId).update({
            isDeleted: true,
            isPublished: false,
            deletedAt: new Date().toISOString(),
            deletedBy: user.uid,
        });
        revalidateTag('quizzes');
        revalidatePath('/teacher/quizzes');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}
