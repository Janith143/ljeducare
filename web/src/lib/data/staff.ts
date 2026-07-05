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

function staffSlug(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${base || 'teacher'}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Ensure a user has a teacher `staff` profile (for teaching roles), returning its id.
 * Reuses an existing profile linked to the user; otherwise creates a minimal one.
 * Shared by staff creation and promoting an existing account to a teaching role.
 */
export async function ensureStaffProfile(
    userId: string,
    opts: { name: string; email: string; commissionRate?: number; subjects?: string[] },
): Promise<string> {
    const db = adminDb();
    const existing = await db.collection(COLLECTIONS.STAFF).where('userId', '==', userId).limit(1).get();
    if (!existing.empty) return existing.docs[0].id;

    const ref = db.collection(COLLECTIONS.STAFF).doc();
    await ref.set({
        id: ref.id,
        userId,
        name: opts.name,
        slug: staffSlug(opts.name),
        email: opts.email,
        profileImage: '',
        avatar: '',
        tagline: '',
        bio: '',
        subjects: opts.subjects ?? [],
        commissionRate: Math.min(100, Math.max(0, Number(opts.commissionRate) || 0)),
        manualBalance: 0,
        totalEarned: 0,
        isPublished: false,
        createdAt: new Date().toISOString(),
    });
    return ref.id;
}
