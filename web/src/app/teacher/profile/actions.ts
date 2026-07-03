'use server';

import { revalidatePath } from 'next/cache';
import { COLLECTIONS } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

/** Toggle a teacher's "auto-record to Zoom cloud" preference. */
export async function setAutoRecordAction(staffId: string, enabled: boolean) {
    const user = await requireRole('teacher', 'teacher_admin');
    if (user.role === 'teacher') {
        const staff = await getOwnStaffProfile(user);
        if (!staff || staff.id !== staffId) return { error: 'Not your profile.' };
    }
    await adminDb().collection(COLLECTIONS.STAFF).doc(staffId).set({ zoomAutoRecordEnabled: enabled }, { merge: true });
    revalidatePath('/teacher/profile');
    return { ok: true };
}
