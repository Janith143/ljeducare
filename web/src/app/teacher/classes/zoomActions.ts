'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { COLLECTIONS, TEACHING_ROLES } from '@ljeducare/shared';
import { requireRole, type SessionUser } from '@/lib/auth/session';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

async function authorizeClass(user: SessionUser, classId: string) {
    const ref = adminDb().collection(COLLECTIONS.CLASSES).doc(classId);
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Class not found.');
    if (user.role !== 'teacher_admin') {
        const staff = await getOwnStaffProfile(user);
        if (!staff || doc.data()!.teacherId !== staff.id) throw new Error('Not your class.');
    }
    return ref;
}

/** Persist a created Zoom meeting onto the class (called after createZoomMeeting). */
export async function saveZoomMeetingAction(
    classId: string,
    meeting: { meetingId: string; startUrl?: string },
) {
    const user = await requireRole(...TEACHING_ROLES);
    try {
        const ref = await authorizeClass(user, classId);
        await ref.update({
            meetProvider: 'zoom',
            zoomMeetingId: String(meeting.meetingId),
            ...(meeting.startUrl ? { zoomStartUrl: meeting.startUrl } : {}),
        });
        revalidateTag('classes');
        revalidatePath(`/teacher/classes/${classId}/edit`);
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

/** Detach the Zoom meeting from a class. */
export async function clearZoomMeetingAction(classId: string) {
    const user = await requireRole(...TEACHING_ROLES);
    try {
        const ref = await authorizeClass(user, classId);
        const { FieldValue } = await import('firebase-admin/firestore');
        await ref.update({
            meetProvider: FieldValue.delete(),
            zoomMeetingId: FieldValue.delete(),
            zoomStartUrl: FieldValue.delete(),
        });
        revalidateTag('classes');
        revalidatePath(`/teacher/classes/${classId}/edit`);
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}
