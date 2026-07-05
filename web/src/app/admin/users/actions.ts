'use server';

import { revalidatePath } from 'next/cache';
import type { Permission, Role } from '@ljeducare/shared';
import { ALL_PERMISSIONS, COLLECTIONS, MAIN_ADMIN_ONLY } from '@ljeducare/shared';
import { requirePermission, requireRole } from '@/lib/auth/session';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { ensureStaffProfile } from '@/lib/data/staff';

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

    revalidatePath('/admin/users');
    return { ok: true };
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

    // Promoting to a teaching role → make sure a staff profile exists.
    if ((role === 'teacher' || role === 'teacher_admin') && !data.staffId) {
        const name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || (data.email ?? 'Teacher');
        update.staffId = await ensureStaffProfile(uid, { name, email: data.email ?? '' });
    }

    await ref.set(update, { merge: true }); // → syncRoleClaims mirrors role/permissions into claims
    await adminAuth().revokeRefreshTokens(uid); // force re-auth so new access applies immediately

    revalidatePath('/admin/users');
    return { ok: true };
}
