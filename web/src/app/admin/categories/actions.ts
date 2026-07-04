'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { HomepageSettings } from '@ljeducare/shared';
import { COLLECTIONS, SETTINGS_DOCS, slugify } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export interface CategoryFormInput {
    id?: string;
    name: string;
    description?: string;
    image?: string;
    featured?: boolean;
    enabled?: boolean;
    pinnedTeacherIds?: string[];
}

/** Categories + the homepage feed everything on `/` and `/categories` — refresh all. */
function revalidateStorefront() {
    revalidateTag('categories');
    revalidatePath('/');
    revalidatePath('/categories');
    revalidatePath('/admin/categories');
}

export async function saveCategoryAction(input: CategoryFormInput) {
    await requirePermission('content');
    const name = input.name?.trim();
    if (!name) return { error: 'Name is required.' };
    try {
        const db = adminDb();
        const fields = {
            name,
            description: input.description?.trim() || '',
            image: input.image?.trim() || '',
            featured: !!input.featured,
            enabled: input.enabled !== false,
            pinnedTeacherIds: (input.pinnedTeacherIds ?? []).filter(Boolean),
        };
        if (input.id) {
            // Slug is immutable (content references it) — only mutable fields change.
            await db.collection(COLLECTIONS.CATEGORIES).doc(input.id).update(fields);
        } else {
            const existing = await db.collection(COLLECTIONS.CATEGORIES).get();
            const ref = db.collection(COLLECTIONS.CATEGORIES).doc();
            await ref.set({
                ...fields,
                id: ref.id,
                slug: slugify(name),
                order: existing.size,
                createdAt: new Date().toISOString(),
            });
        }
        revalidateStorefront();
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

export async function deleteCategoryAction(id: string) {
    await requirePermission('content');
    try {
        await adminDb().collection(COLLECTIONS.CATEGORIES).doc(id).delete();
        revalidateStorefront();
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

/** Persist a new display order (client sends the full ordered id list after a move). */
export async function reorderCategoriesAction(orderedIds: string[]) {
    await requirePermission('content');
    try {
        const db = adminDb();
        const batch = db.batch();
        orderedIds.forEach((id, i) =>
            batch.update(db.collection(COLLECTIONS.CATEGORIES).doc(id), { order: i }),
        );
        await batch.commit();
        revalidateStorefront();
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

export async function saveHomepageAction(input: HomepageSettings) {
    await requirePermission('content');
    try {
        await adminDb()
            .collection(COLLECTIONS.SETTINGS)
            .doc(SETTINGS_DOCS.HOMEPAGE)
            .set(
                {
                    heroTitle: input.heroTitle?.trim() || '',
                    heroSubtitle: input.heroSubtitle?.trim() || '',
                    featuredCategorySlugs: input.featuredCategorySlugs ?? [],
                    featuredTeacherIds: input.featuredTeacherIds ?? [],
                    updatedAt: new Date().toISOString(),
                },
                { merge: true },
            );
        revalidateStorefront();
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}
