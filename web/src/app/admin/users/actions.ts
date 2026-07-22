'use server';

import { revalidatePath } from 'next/cache';
import type { Permission, Role } from '@ljeducare/shared';
import { ALL_PERMISSIONS, COLLECTIONS, MAIN_ADMIN_ONLY, isTeachingRole } from '@ljeducare/shared';
import { requirePermission, requireRole } from '@/lib/auth/session';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { ensureStaffProfile } from '@/lib/data/staff';
import { cascadeTeacherContent, restoreTeacherContent } from '@/lib/data/teacherCascade';

/** Roles the main admin may assign to an account (main_admin + kiosk are excluded). */
const ASSIGNABLE_ROLES: Role[] = ['manager', 'teacher_admin', 'teacher', 'student'];

/** Suspend/reactivate a user account (blocks sign-in + flags the doc). */
export async function setUserStatusAction(uid: string, status: 'active' | 'suspended') {
    const admin = await requirePermission('users');
    if (uid === admin.uid) return { error: 'You cannot suspend yourself.' };

    const doc = await adminDb().doc(`${COLLECTIONS.USERS}/${uid}`).get();
    if (!doc.exists) return { error: 'User not found.' };
    if (doc.data()?.role === 'main_admin') return { error: 'main_admin cannot be suspended here.' };

    await adminAuth().updateUser(uid, { disabled: status === 'suspended' });
    if (status === 'suspended') await adminAuth().revokeRefreshTokens(uid);
    await doc.ref.update({ status });

    // Suspending a teacher hides everything they taught; reactivating gives it back.
    // Restore only reverts what the cascade hid, so deliberate deletions stay deleted.
    let hidden;
    let restored;
    // Older accounts may lack users.staffId — fall back to the staff doc linked by userId,
    // otherwise the cascade would silently skip those teachers.
    let staffId = doc.data()?.staffId as string | undefined;
    if (!staffId) {
        const byUser = await adminDb()
            .collection(COLLECTIONS.STAFF)
            .where('userId', '==', uid)
            .limit(1)
            .get();
        if (!byUser.empty) staffId = byUser.docs[0].id;
    }
    if (staffId) {
        if (status === 'suspended') {
            hidden = await cascadeTeacherContent(staffId, { by: admin.uid, reason: 'suspended' });
        } else {
            restored = await restoreTeacherContent(staffId, { by: admin.uid });
        }
        revalidatePath('/classes');
        revalidatePath('/courses');
        revalidatePath('/quizzes');
    }

    revalidatePath('/admin/users');
    return { ok: true, hidden, restored };
}

/**
 * Grant a role + delegated permissions to an account. main_admin ONLY. Cannot target
 * yourself or another main_admin, and main_admin/kiosk are never assignable. Promoting
 * to a teaching role ensures a staff profile; the target's tokens are revoked so the
 * new access takes effect on their next sign-in.
 */
export async function updateUserAccessAction(uid: string, role: Role, perms: Permission[]) {
    const admin = await requireRole('main_admin');
    if (uid === admin.uid) return { error: 'You cannot change your own access.' };
    if (!ASSIGNABLE_ROLES.includes(role)) return { error: 'That role cannot be assigned here.' };

    const ref = adminDb().doc(`${COLLECTIONS.USERS}/${uid}`);
    const doc = await ref.get();
    if (!doc.exists) return { error: 'User not found.' };
    const data = doc.data()!;
    if (data.role === 'main_admin') return { error: 'The main admin account cannot be changed here.' };

    // Only manager/teacher_admin carry delegated permissions; drop main-admin-only keys.
    const cleanPerms =
        role === 'manager' || role === 'teacher_admin'
            ? (perms ?? []).filter((p) => ALL_PERMISSIONS.includes(p) && !MAIN_ADMIN_ONLY.includes(p))
            : [];

    const update: Record<string, unknown> = { role, permissions: cleanPerms };

    // Promoting to a teaching role → make sure a staff profile exists, so the account
    // shows up under Staff with a commission rate. Managers and teacher admins teach
    // too, so they get one as well (see TEACHING_ROLES).
    if (isTeachingRole(role) && !data.staffId) {
        const name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || (data.email ?? 'Teacher');
        update.staffId = await ensureStaffProfile(uid, { name, email: data.email ?? '' });
    }

    await ref.set(update, { merge: true }); // → syncRoleClaims mirrors role/permissions into claims
    await adminAuth().revokeRefreshTokens(uid); // force re-auth so new access applies immediately

    revalidatePath('/admin/users');
    return { ok: true };
}
