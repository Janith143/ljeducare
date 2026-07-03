'use server';

import { revalidatePath } from 'next/cache';
import { COLLECTIONS } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

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
