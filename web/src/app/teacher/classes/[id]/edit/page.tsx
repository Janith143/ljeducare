import { notFound } from 'next/navigation';
import type { LiveClass, StaffMember } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import ClassForm from '@/components/teacher/ClassForm';
import ZoomMeetingManager from '@/components/teacher/ZoomMeetingManager';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function EditClassPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await requireRole('teacher', 'teacher_admin');
    const { id } = await params;

    const doc = await adminDb().collection(COLLECTIONS.CLASSES).doc(id).get();
    if (!doc.exists || doc.data()!.isDeleted) notFound();
    const cls = { ...(doc.data() as LiveClass), id: doc.id };

    // The owning teacher's staff profile (for the Zoom host + connection state).
    let ownerStaff: StaffMember | null = null;
    if (user.role !== 'teacher_admin') {
        ownerStaff = await getOwnStaffProfile(user);
        if (!ownerStaff || cls.teacherId !== ownerStaff.id) notFound();
    } else if (cls.teacherId) {
        const s = await adminDb().collection(COLLECTIONS.STAFF).doc(cls.teacherId).get();
        ownerStaff = s.exists ? ({ ...(s.data() as StaffMember), id: s.id }) : null;
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">Edit class</h1>
            <ClassForm existing={cls} />
            <ZoomMeetingManager
                info={{
                    classId: cls.id,
                    staffId: cls.teacherId ?? null,
                    title: cls.title,
                    date: cls.date,
                    startTime: cls.startTime,
                    endTime: cls.endTime,
                    zoomMeetingId: cls.zoomMeetingId,
                    zoomConnected: !!ownerStaff?.zoomAccountConnected,
                }}
            />
        </div>
    );
}
