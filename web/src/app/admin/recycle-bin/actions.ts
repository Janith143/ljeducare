'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { COLLECTIONS } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

const COLLECTION_BY_KIND: Record<string, { collection: string; tag: string }> = {
    class: { collection: COLLECTIONS.CLASSES, tag: 'classes' },
    course: { collection: COLLECTIONS.COURSES, tag: 'courses' },
    quiz: { collection: COLLECTIONS.QUIZZES, tag: 'quizzes' },
};

/** Restore a soft-deleted item (stays unpublished so an admin re-checks it first). */
export async function restoreItemAction(kind: string, id: string) {
    await requirePermission('recycle_bin');
    const target = COLLECTION_BY_KIND[kind];
    if (!target) return { error: 'Unknown item type.' };

    const ref = adminDb().collection(target.collection).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return { error: 'Item not found.' };

    await ref.update({ isDeleted: false, isPublished: false, restoredAt: new Date().toISOString() });
    revalidateTag(target.tag);
    revalidatePath('/admin/recycle-bin');
    return { ok: true };
}

/** Permanently delete a soft-deleted item. */
export async function purgeItemAction(kind: string, id: string) {
    await requirePermission('recycle_bin');
    const target = COLLECTION_BY_KIND[kind];
    if (!target) return { error: 'Unknown item type.' };

    const ref = adminDb().collection(target.collection).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return { error: 'Item not found.' };
    if (!doc.data()?.isDeleted) return { error: 'Only deleted items can be purged.' };

    await ref.delete();
    revalidatePath('/admin/recycle-bin');
    return { ok: true };
}
