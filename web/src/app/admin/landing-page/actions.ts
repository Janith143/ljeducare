'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import type { InquiryStatus, LandingSettings } from '@ljeducare/shared';
import { COLLECTIONS, SETTINGS_DOCS, STORAGE_PATHS } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { LANDING_PATH } from '@/lib/site';

/**
 * Upload a landing-page image via the SERVER (Admin SDK), authed by the session
 * cookie — same reasoning as uploadCategoryImageAction: a client-side Storage
 * upload would need the client SDK's token to carry an admin role, which diverges
 * from the cookie session and fails with storage/unauthorized.
 */
export async function uploadLandingImageAction(formData: FormData): Promise<{ url?: string; error?: string }> {
    await requirePermission('landing_page');
    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'No file provided.' };
    if (!file.type.startsWith('image/')) return { error: 'Please choose an image file.' };
    if (file.size > 5 * 1024 * 1024) return { error: 'Image must be under 5 MB.' };

    try {
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) return { error: 'Storage is not configured.' };
        const token = randomUUID();
        const path = `${STORAGE_PATHS.LANDING_IMAGES}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
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

/**
 * Save one section of settings/landing.
 *
 * Written per-section (merge on the section key) rather than as a whole-document
 * replace, so two admins editing different tabs can't clobber each other.
 */
export async function saveLandingSectionAction<K extends keyof LandingSettings>(
    section: K,
    value: LandingSettings[K],
): Promise<{ ok?: true; error?: string }> {
    const user = await requirePermission('landing_page');
    const allowed: (keyof LandingSettings)[] = [
        'brand', 'hero', 'trust', 'founder', 'features', 'programs', 'subjects',
        'faculty', 'testimonials', 'results', 'gallery', 'recognition', 'events',
        'faq', 'contact', 'footer', 'seo',
    ];
    if (!allowed.includes(section)) return { error: 'Unknown section.' };

    try {
        await adminDb()
            .collection(COLLECTIONS.SETTINGS)
            .doc(SETTINGS_DOCS.LANDING)
            .set(
                {
                    [section]: value ?? {},
                    updatedAt: new Date().toISOString(),
                    updatedBy: user.email ?? user.uid,
                },
                { merge: true },
            );
        revalidatePath(LANDING_PATH);
        revalidatePath('/admin/landing-page');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

export async function updateInquiryStatusAction(id: string, status: InquiryStatus) {
    await requirePermission('landing_page');
    try {
        await adminDb().collection(COLLECTIONS.LANDING_INQUIRIES).doc(id).update({ status });
        revalidatePath('/admin/inquiries');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

export async function deleteInquiryAction(id: string) {
    await requirePermission('landing_page');
    try {
        await adminDb().collection(COLLECTIONS.LANDING_INQUIRIES).doc(id).delete();
        revalidatePath('/admin/inquiries');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

export async function removeSubscriberAction(id: string) {
    await requirePermission('landing_page');
    try {
        await adminDb().collection(COLLECTIONS.NEWSLETTER_SUBSCRIBERS).doc(id).delete();
        revalidatePath('/admin/inquiries');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}
