'use server';

import { revalidatePath } from 'next/cache';
import type { ExamResult, LiveClass } from '@ljeducare/shared';
import { COLLECTIONS, TEACHING_ROLES } from '@ljeducare/shared';
import { requireRole, type SessionUser } from '@/lib/auth/session';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

export interface ExamResultInput {
    classId: string;
    examId?: string;               // set when editing an existing exam
    name: string;
    category: string;
    date: string;
    maxMark: number;
    studentScores: { studentId: string; score: number }[];
}

async function authorizeClass(user: SessionUser, classId: string) {
    const db = adminDb();
    const doc = await db.collection(COLLECTIONS.CLASSES).doc(classId).get();
    if (!doc.exists || doc.data()!.isDeleted) throw new Error('Class not found.');
    if (user.role !== 'teacher_admin') {
        const staff = await getOwnStaffProfile(user);
        if (!staff || doc.data()!.teacherId !== staff.id) throw new Error('Not your class.');
    }
    return { db, cls: { ...(doc.data() as LiveClass), id: doc.id } };
}

/** Create or update a categorized exam result on a class (ported ExamResult model). */
export async function saveExamResultAction(input: ExamResultInput) {
    const user = await requireRole(...TEACHING_ROLES);
    if (!input.name.trim()) return { error: 'Exam name is required.' };
    if (!input.category.trim()) return { error: 'Category is required (e.g. Model Papers).' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: 'Valid date is required.' };
    if (!(input.maxMark > 0)) return { error: 'Max mark must be positive.' };

    try {
        const { db, cls } = await authorizeClass(user, input.classId);
        const maxMark = Math.round(input.maxMark);
        const studentScores = input.studentScores
            .filter((s) => s.studentId && Number.isFinite(s.score))
            .map((s) => ({ studentId: s.studentId, score: Math.min(maxMark, Math.max(0, Number(s.score))) }));

        const exam: ExamResult = {
            id: input.examId || crypto.randomUUID(),
            name: input.name.trim(),
            category: input.category.trim(),
            date: input.date,
            maxMark,
            studentScores,
            createdAt: new Date().toISOString(),
        };

        const existing = cls.examResults ?? [];
        const next = input.examId
            ? existing.map((e) => (e.id === input.examId ? { ...exam, createdAt: e.createdAt } : e))
            : [...existing, exam];
        const categories = [...new Set([...(cls.examCategories ?? []), exam.category])];

        await db.collection(COLLECTIONS.CLASSES).doc(cls.id).update({
            examResults: next,
            examCategories: categories,
        });
        revalidatePath('/teacher/exams');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

export async function deleteExamResultAction(classId: string, examId: string) {
    const user = await requireRole(...TEACHING_ROLES);
    try {
        const { db, cls } = await authorizeClass(user, classId);
        await db.collection(COLLECTIONS.CLASSES).doc(cls.id).update({
            examResults: (cls.examResults ?? []).filter((e) => e.id !== examId),
        });
        revalidatePath('/teacher/exams');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}
