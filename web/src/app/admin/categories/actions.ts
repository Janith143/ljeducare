'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import type { HomepageSettings } from '@ljeducare/shared';
import { COLLECTIONS, SETTINGS_DOCS, slugify } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { adminDb, adminStorage } from '@/lib/firebase/admin';

/**
 * Upload a category image via the SERVER (Admin SDK), authed by the session cookie.
 * The old client-side Storage upload needed the client SDK's token to carry an admin
 * role, which diverges from the cookie session and failed with storage/unauthorized.
 */
export async function uploadCategoryImageAction(formData: FormData): Promise<{ url?: string; error?: string }> {
    await requirePermission('content');
    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'No file provided.' };
    if (!file.type.startsWith('image/')) return { error: 'Please choose an image file.' };
    if (file.size > 5 * 1024 * 1024) return { error: 'Image must be under 5 MB.' };

    try {
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) return { error: 'Storage is not configured.' };
        const token = randomUUID();
        const path = `category-images/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await adminStorage()
            .bucket(bucketName)
            .file(path)
            .save(buffer, {
                metadata: { contentType: file.type, metadata: { firebaseStorageDownloadTokens: token } },
            });
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
        return { url };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

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

/**
 * Build a clean, readable category slug.
 *
 * `slugify` appends a random suffix by default, which is right for classes and courses
 * (two teachers may both title one "Grade 11 Maths") but wrong here: categories are a
 * small curated set whose slug IS the public URL — /categories/cosmetics, not
 * /categories/cosmatics-020n. Slugs are immutable once created, so a random one is
 * permanent. Only disambiguate on a genuine clash, and only against the taken set.
 */
function categorySlug(name: string, taken: Set<string>): string {
    const base = slugify(name, false) || 'category';
    if (!taken.has(base)) return base;
    for (let n = 2; n < 100; n += 1) {
        if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
    }
    return `${base}-${Date.now()}`;
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
            const taken = new Set(existing.docs.map((d) => String(d.data().slug ?? '')));
            const ref = db.collection(COLLECTIONS.CATEGORIES).doc();
            await ref.set({
                ...fields,
                id: ref.id,
                slug: categorySlug(name, taken),
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
