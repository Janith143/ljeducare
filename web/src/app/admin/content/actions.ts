'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { COLLECTIONS, approvalOf } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

const TARGET: Record<string, { collection: string; tag: string }> = {
    class: { collection: COLLECTIONS.CLASSES, tag: 'classes' },
    course: { collection: COLLECTIONS.COURSES, tag: 'courses' },
    quiz: { collection: COLLECTIONS.QUIZZES, tag: 'quizzes' },
};

function refresh(tag: string) {
    revalidateTag(tag);
    revalidatePath('/admin/content');
    revalidatePath('/teacher/classes');
    revalidatePath('/teacher/courses');
}

/**
 * Approve a submitted class/course and put it live in one step — an admin pressing
 * "Approve" means "this may be seen", so making them then chase the teacher to press
 * Publish would just strand approved content in limbo.
 */
export async function approveContentAction(kind: string, id: string) {
    const target = TARGET[kind];
    if (!target) return { error: 'Unknown item type.' };
    const admin = await requirePermission('content');

    const ref = adminDb().collection(target.collection).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return { error: 'Item not found.' };
    const data = snap.data() || {};
    if (data.isDeleted) return { error: 'That item is in the recycle bin.' };
    if (approvalOf(data.adminApproval) === 'approved') return { error: 'Already approved.' };

    await ref.update({
        adminApproval: 'approved',
        isPublished: true,
        approvedAt: new Date().toISOString(),
        approvedBy: admin.uid,
        approvalNote: null,
    });
    refresh(target.tag);
    return { ok: true };
}

/**
 * Send it back to the teacher with a note. Stays unpublished; the teacher edits and
 * resubmits (canSubmit allows 'rejected' → 'pending').
 */
export async function rejectContentAction(kind: string, id: string, note: string) {
    const target = TARGET[kind];
    if (!target) return { error: 'Unknown item type.' };
    const admin = await requirePermission('content');

    const ref = adminDb().collection(target.collection).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return { error: 'Item not found.' };

    await ref.update({
        adminApproval: 'rejected',
        isPublished: false,
        approvalNote: (note ?? '').trim().slice(0, 500) || 'Changes requested.',
        reviewedAt: new Date().toISOString(),
        reviewedBy: admin.uid,
    });
    refresh(target.tag);
    return { ok: true };
}
