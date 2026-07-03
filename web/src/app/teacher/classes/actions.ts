'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { LiveClass } from '@ljeducare/shared';
import { COLLECTIONS, slugify } from '@ljeducare/shared';
import { requireRole, type SessionUser } from '@/lib/auth/session';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

export interface ClassFormInput {
    id?: string;
    title: string;
    subject: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    basePrice: number;
    usdOverride?: number | null;
    isFree: boolean;
    targetAudience: string;
    mode: 'Online' | 'Physical' | 'Both';
    recurrence: 'none' | 'weekly' | 'flexible';
    weeklyPaymentOption?: 'per_session' | 'per_month';
    medium?: string;
    grade?: string;
    joiningLink?: string;
    recordingMaxViews?: number;
    recordingExpiryDays?: number;
}

/** Load target + assert the caller may manage it. Returns {db, staffId}. */
async function authorize(user: SessionUser, existingId?: string) {
    const staff = await getOwnStaffProfile(user);
    const staffId = staff?.id ?? null;
    const db = adminDb();
    if (existingId) {
        const doc = await db.collection(COLLECTIONS.CLASSES).doc(existingId).get();
        if (!doc.exists) throw new Error('Class not found.');
        const owner = doc.data()!.teacherId;
        if (user.role !== 'teacher_admin' && owner !== staffId) throw new Error('Not your class.');
        return { db, staffId, existing: { ...(doc.data() as LiveClass), id: doc.id } };
    }
    if (user.role !== 'teacher_admin' && !staffId) {
        throw new Error('No staff profile linked to your account — ask an admin.');
    }
    return { db, staffId, existing: null };
}

function validate(input: ClassFormInput): string | null {
    if (!input.title.trim()) return 'Title is required.';
    if (!input.subject.trim()) return 'Subject is required.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return 'Valid date is required.';
    if (!/^\d{2}:\d{2}$/.test(input.startTime) || !/^\d{2}:\d{2}$/.test(input.endTime)) return 'Valid times are required.';
    if (input.endTime <= input.startTime) return 'End time must be after start time.';
    if (!input.isFree && !(input.basePrice > 0)) return 'Price must be positive (or mark as free).';
    return null;
}

export async function saveClassAction(input: ClassFormInput) {
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
            endTime: input.endTime,
            pricing,
            targetAudience: input.targetAudience.trim(),
            mode: input.mode,
            recurrence: input.recurrence,
            ...(input.recurrence === 'weekly' && input.weeklyPaymentOption
                ? { weeklyPaymentOption: input.weeklyPaymentOption }
                : {}),
            medium: input.medium?.trim() || '',
            grade: input.grade?.trim() || '',
            joiningLink: input.joiningLink?.trim() || '',
            recordingMaxViews: Math.max(0, Number(input.recordingMaxViews) || 0),
            recordingExpiryDays: [0, 14, 30, 60].includes(Number(input.recordingExpiryDays))
                ? Number(input.recordingExpiryDays)
                : 60,
        };

        if (existing) {
            await db.collection(COLLECTIONS.CLASSES).doc(existing.id).update(fields);
        } else {
            const ref = db.collection(COLLECTIONS.CLASSES).doc();
            await ref.set({
                ...fields,
                id: ref.id,
                slug: slugify(input.title),
                teacherId: staffId,
                status: 'scheduled',
                isPublished: false,
                adminApproval: 'not_requested',
                createdAt: new Date().toISOString(),
            });
        }

        revalidateTag('classes');
        revalidatePath('/teacher/classes');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

export async function togglePublishClassAction(classId: string, publish: boolean) {
    const user = await requireRole('teacher', 'teacher_admin');
    try {
        const { db } = await authorize(user, classId);
        await db.collection(COLLECTIONS.CLASSES).doc(classId).update({ isPublished: publish });
        revalidateTag('classes');
        revalidatePath('/teacher/classes');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

/** Soft delete → recycle bin (ported source pattern). */
export async function deleteClassAction(classId: string) {
    const user = await requireRole('teacher', 'teacher_admin');
    try {
        const { db } = await authorize(user, classId);
        await db.collection(COLLECTIONS.CLASSES).doc(classId).update({
            isDeleted: true,
            isPublished: false,
            deletedAt: new Date().toISOString(),
            deletedBy: user.uid,
        });
        revalidateTag('classes');
        revalidatePath('/teacher/classes');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}
