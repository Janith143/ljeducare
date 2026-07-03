import 'server-only';

import type { StaffMember, User } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { adminDb } from '@/lib/firebase/admin';

/** All non-deleted staff profiles, newest first. */
export async function listStaff(): Promise<StaffMember[]> {
    const snap = await adminDb().collection(COLLECTIONS.STAFF).get();
    return snap.docs
        .map((d) => ({ ...(d.data() as StaffMember), id: d.id }))
        .filter((s) => !s.isDeleted)
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

/** Users holding staff-area roles (for the roles & permissions table). */
export async function listStaffUsers(): Promise<User[]> {
    const snap = await adminDb()
        .collection(COLLECTIONS.USERS)
        .where('role', 'in', ['main_admin', 'manager', 'teacher_admin', 'teacher'])
        .get();
    return snap.docs.map((d) => ({ ...(d.data() as User), id: d.id }));
}
