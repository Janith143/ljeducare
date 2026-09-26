'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import type { Role } from '@ljeducare/shared';
import { COLLECTIONS, STORAGE_PATHS, isTeachingRole } from '@ljeducare/shared';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/session';
import { ensureStaffProfile } from '@/lib/data/staff';
import { cascadeTeacherContent, countAffectedStudents } from '@/lib/data/teacherCascade';

const CREATABLE_ROLES: Role[] = ['manager', 'teacher_admin', 'teacher'];

export interface CreateStaffInput {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: Role;
    commissionRate: number;
    subjects: string;
}

/** Create a staff login + users doc (+ staff profile for teaching roles). */
export async function createStaffAction(input: CreateStaffInput) {
    const admin = await requirePermission('staff');
    if (!CREATABLE_ROLES.includes(input.role)) return { error: 'Invalid role.' };
    if (input.password.length < 8) return { error: 'Password must be at least 8 characters.' };
    const name = `${input.firstName} ${input.lastName}`.trim();
    if (!name || !input.email.includes('@')) return { error: 'Name and a valid email are required.' };
    const commissionRate = Math.min(100, Math.max(0, Number(input.commissionRate) || 0));

    try {
        const email = input.email.trim().toLowerCase();
        const user = await adminAuth().createUser({ email, password: input.password, displayName: name });

        const staffId = isTeachingRole(input.role)
            ? await ensureStaffProfile(user.uid, {
                  name,
                  email,
                  commissionRate,
                  subjects: input.subjects.split(',').map((s) => s.trim()).filter(Boolean),
              })
            : undefined;

        // users doc write → auth-security syncRoleClaims mirrors role into claims.
        await adminDb().doc(`${COLLECTIONS.USERS}/${user.uid}`).set({
            id: user.uid,
            uid: user.uid,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            email,
            role: input.role,
            avatar: '',
            status: 'active',
            ...(staffId ? { staffId } : {}),
            createdAt: new Date().toISOString(),
            registrationSource: `admin:${admin.uid}`,
        });

        revalidatePath('/admin/staff');
        return { ok: true };
    } catch (e: unknown) {
        const code = (e as { code?: string })?.code ?? '';
        return {
            error: code.includes('email-already-exists')
                ? 'A user with this email already exists.'
                : 'Could not create the staff member.',
        };
    }
}

/** Update a teacher's commission %. */
export async function setCommissionAction(staffId: string, commissionRate: number) {
    await requirePermission('staff');
    const rate = Math.min(100, Math.max(0, Number(commissionRate) || 0));
    await adminDb().doc(`${COLLECTIONS.STAFF}/${staffId}`).set({ commissionRate: rate }, { merge: true });
    revalidatePath('/admin/staff');
    return { ok: true };
}

/** The staff doc, only while it's a live (not removed) profile. */
async function liveStaffRef(staffId: string) {
    const ref = adminDb().doc(`${COLLECTIONS.STAFF}/${String(staffId)}`);
    const snap = await ref.get();
    return snap.exists && !snap.data()?.isDeleted ? ref : null;
}

/**
 * Show/hide a teacher publicly (Teachers page, subject sections, /teachers/[slug]).
 * Until now only the teacher could tick this, so a teacher who never did was invisible
 * under every subject an admin pinned them to.
 */
export async function setStaffPublishedAction(staffId: string, isPublished: boolean) {
    await requirePermission('staff');
    const ref = await liveStaffRef(staffId);
    if (!ref) return { error: 'Staff profile not found.' };
    await ref.update({ isPublished: isPublished === true });
    revalidateTag('teachers');
    revalidatePath('/admin/staff');
    return { ok: true };
}

/** Set (form field `file`, an already-cropped image) or clear a teacher's profile photo. */
export async function saveStaffPhotoAction(formData: FormData): Promise<{ ok?: true; error?: string }> {
    await requirePermission('staff');
    const staffId = String(formData.get('staffId') ?? '');
    const ref = staffId ? await liveStaffRef(staffId) : null;
    if (!ref) return { error: 'Staff profile not found.' };

    let profileImage = '';
    const file = formData.get('file');
    if (file instanceof File) {
        if (!file.type.startsWith('image/')) return { error: 'Please choose an image file.' };
        if (file.size > 5 * 1024 * 1024) return { error: 'Image must be under 5 MB.' };
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) return { error: 'Storage is not configured.' };
        try {
            const token = randomUUID();
            const path = `${STORAGE_PATHS.PROFILE_IMAGES}/teacher-${ref.id}-${Date.now()}.jpg`;
            await adminStorage()
                .bucket(bucketName)
                .file(path)
                .save(Buffer.from(await file.arrayBuffer()), {
                    metadata: { contentType: file.type, metadata: { firebaseStorageDownloadTokens: token } },
                });
            profileImage = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
        } catch (e: unknown) {
            return { error: (e as Error).message };
        }
    }

    await ref.update({ profileImage });
    revalidateTag('teachers');
    revalidatePath('/admin/staff');
    return { ok: true };
}

/**
 * Remove a staff member: soft-delete their teacher profile (hidden from the roster
 * and public site) and disable the linked login. Reversible — the account can be
 * reactivated under Users, and the profile doc keeps its data (isDeleted flag).
 * Their existing content/sales are left intact.
 */
export async function removeStaffAction(
    staffId: string,
): Promise<{ ok?: true; error?: string; hidden?: { classes: number; courses: number; quizzes: number; total: number }; studentsAffected?: number }> {
    const admin = await requirePermission('staff');
    const db = adminDb();
    const ref = db.doc(`${COLLECTIONS.STAFF}/${staffId}`);
    const snap = await ref.get();
    if (!snap.exists) return { error: 'Staff profile not found.' };
    const staff = snap.data() as { userId?: string };
    const userId = staff.userId;

    if (userId && userId === admin.uid) return { error: 'You cannot remove your own account.' };
    if (userId) {
        const userSnap = await db.doc(`${COLLECTIONS.USERS}/${userId}`).get();
        if (userSnap.data()?.role === 'main_admin') return { error: 'A main admin cannot be removed here.' };
    }

    // Count BEFORE hiding, so the admin is told how many paying students this cost.
    const studentsAffected = await countAffectedStudents(staffId);

    await ref.set(
        { isDeleted: true, isPublished: false, deletedAt: new Date().toISOString(), deletedBy: admin.uid },
        { merge: true },
    );

    // Removing a teacher hides everything they taught. Tagged + reversible: restoring
    // the account (Users → reactivate) brings the content and student access back.
    const hidden = await cascadeTeacherContent(staffId, { by: admin.uid, reason: 'removed' });

    if (userId) {
        try {
            await adminAuth().updateUser(userId, { disabled: true });
            await adminAuth().revokeRefreshTokens(userId);
        } catch {
            /* the auth user may already be gone — the profile soft-delete still applies */
        }
        await db.doc(`${COLLECTIONS.USERS}/${userId}`).set({ status: 'suspended' }, { merge: true });
    }

    revalidatePath('/admin/staff');
    revalidatePath('/admin/users');
    revalidatePath('/classes');
    revalidatePath('/courses');
    revalidatePath('/quizzes');
    return { ok: true, hidden, studentsAffected };
}
