'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { COLLECTIONS, STORAGE_PATHS, TEACHING_ROLES } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { ensureStaffProfile } from '@/lib/data/staff';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { adminDb, adminStorage } from '@/lib/firebase/admin';

/** Toggle a teacher's "auto-record to Zoom cloud" preference. */
export async function setAutoRecordAction(staffId: string, enabled: boolean) {
    const user = await requireRole(...TEACHING_ROLES);
    if (user.role === 'teacher') {
        const staff = await getOwnStaffProfile(user);
        if (!staff || staff.id !== staffId) return { error: 'Not your profile.' };
    }
    await adminDb().collection(COLLECTIONS.STAFF).doc(staffId).set({ zoomAutoRecordEnabled: enabled }, { merge: true });
    revalidatePath('/teacher/profile');
    return { ok: true };
}

export interface TeacherProfileInput {
    name: string;
    tagline: string;
    bio: string;
    subjects: string[];
    qualifications: string[];
    languages: string[];
    achievements: string[];
    experienceYears: number;
    profileImage: string;
    isPublished: boolean;
}

const clean = (arr: string[]) => (arr ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 40);

/**
 * A teacher edits (or first creates) their OWN staff profile.
 *
 * Only ever writes teacher-owned fields — commissionRate / manualBalance /
 * totalEarned / userId / slug are never touched here (the Firestore rule enforces the
 * money freeze too, so this is defence in depth). `ensureStaffProfile` makes the
 * "create on first save" case work for a teacher with no linked staff doc yet.
 */
export async function saveMyTeacherProfileAction(
    input: TeacherProfileInput,
): Promise<{ ok?: true; error?: string; slug?: string }> {
    const user = await requireRole(...TEACHING_ROLES);
    const name = (input.name ?? '').trim();
    if (!name) return { error: 'Your name is required.' };

    try {
        let staff = await getOwnStaffProfile(user);
        if (!staff) {
            await ensureStaffProfile(user.uid, { name, email: user.email ?? '' });
            staff = await getOwnStaffProfile(user);
            if (!staff) return { error: 'Could not create your profile — please try again.' };
        }

        await adminDb()
            .collection(COLLECTIONS.STAFF)
            .doc(staff.id)
            .set(
                {
                    name: name.slice(0, 120),
                    tagline: (input.tagline ?? '').trim().slice(0, 160),
                    bio: (input.bio ?? '').trim().slice(0, 4000),
                    subjects: clean(input.subjects),
                    qualifications: clean(input.qualifications),
                    languages: clean(input.languages),
                    achievements: clean(input.achievements),
                    experienceYears: Math.min(80, Math.max(0, Number(input.experienceYears) || 0)),
                    profileImage: (input.profileImage ?? '').trim().slice(0, 500),
                    isPublished: input.isPublished === true,
                },
                { merge: true },
            );

        // Refresh the public catalog surfaces that show this teacher.
        revalidateTag('teachers');
        revalidatePath('/teachers');
        revalidatePath(`/teachers/${staff.slug}`);
        revalidatePath('/teacher/profile');
        return { ok: true, slug: staff.slug };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

/**
 * Upload a teacher profile photo via the SERVER (Admin SDK), authed by the session
 * cookie — same pattern as the admin image uploads. Stored under profile-images/,
 * which is publicly readable so it shows on the public teacher page.
 */
export async function uploadTeacherPhotoAction(formData: FormData): Promise<{ url?: string; error?: string }> {
    await requireRole(...TEACHING_ROLES);
    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'No file provided.' };
    if (!file.type.startsWith('image/')) return { error: 'Please choose an image file.' };
    if (file.size > 5 * 1024 * 1024) return { error: 'Image must be under 5 MB.' };

    try {
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) return { error: 'Storage is not configured.' };
        const token = randomUUID();
        const path = `${STORAGE_PATHS.PROFILE_IMAGES}/teacher-${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
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
