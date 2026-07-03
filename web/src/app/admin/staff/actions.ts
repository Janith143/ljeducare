'use server';

import { revalidatePath } from 'next/cache';
import type { Permission, Role } from '@ljeducare/shared';
import { COLLECTIONS, MAIN_ADMIN_ONLY, ALL_PERMISSIONS } from '@ljeducare/shared';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/session';

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
        const user = await adminAuth().createUser({
            email: input.email.trim().toLowerCase(),
            password: input.password,
            displayName: name,
        });

        const db = adminDb();
        const isTeaching = input.role === 'teacher' || input.role === 'teacher_admin';
        let staffId: string | undefined;

        if (isTeaching) {
            const staffRef = db.collection(COLLECTIONS.STAFF).doc();
            staffId = staffRef.id;
            await staffRef.set({
                id: staffRef.id,
                userId: user.uid,
                name,
                slug: slugify(name),
                email: input.email.trim().toLowerCase(),
                profileImage: '',
                avatar: '',
                tagline: '',
                bio: '',
                subjects: input.subjects.split(',').map((s) => s.trim()).filter(Boolean),
                commissionRate,
                manualBalance: 0,
                totalEarned: 0,
                isPublished: false,
                createdAt: new Date().toISOString(),
            });
        }

        // users doc write → auth-security syncRoleClaims mirrors role into claims.
        await db.doc(`${COLLECTIONS.USERS}/${user.uid}`).set({
            id: user.uid,
            uid: user.uid,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            email: input.email.trim().toLowerCase(),
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

/** Update a staff user's role and delegated permission subset. */
export async function updateRolePermsAction(uid: string, role: Role, perms: Permission[]) {
    await requirePermission('staff');
    if (!CREATABLE_ROLES.includes(role)) return { error: 'Invalid role.' };
    const clean = perms.filter((p) => ALL_PERMISSIONS.includes(p) && !MAIN_ADMIN_ONLY.includes(p));

    const target = await adminDb().doc(`${COLLECTIONS.USERS}/${uid}`).get();
    if (!target.exists) return { error: 'User not found.' };
    if (target.data()?.role === 'main_admin') return { error: 'main_admin cannot be modified here.' };

    await target.ref.set({ role, permissions: clean }, { merge: true });
    revalidatePath('/admin/staff');
    return { ok: true };
}

/** Update a teacher's commission %. */
export async function setCommissionAction(staffId: string, commissionRate: number) {
    await requirePermission('staff');
    const rate = Math.min(100, Math.max(0, Number(commissionRate) || 0));
    await adminDb().doc(`${COLLECTIONS.STAFF}/${staffId}`).set({ commissionRate: rate }, { merge: true });
    revalidatePath('/admin/staff');
    return { ok: true };
}

function slugify(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
