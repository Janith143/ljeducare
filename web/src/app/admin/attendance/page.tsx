import { COLLECTIONS } from '@ljeducare/shared';
import AttendanceReport, { type AttendanceRecordRow } from '@/components/admin/attendance/AttendanceReport';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminAttendancePage() {
    await requirePermission('attendance');

    const snap = await adminDb().collection(COLLECTIONS.ATTENDANCE).get();
    const records = snap.docs
        .map((d) => {
            const r = d.data();
            return {
                id: d.id,
                sessionDate: r.sessionDate as string,
                classId: r.classId as string,
                classTitle: r.classTitle as string,
                studentName: r.studentName as string,
                studentId: r.studentId as string,
                paymentStatus: r.paymentStatus as string,
                attendedAt: r.attendedAt as string,
            } satisfies AttendanceRecordRow;
        })
        .sort((a, b) => b.attendedAt.localeCompare(a.attendedAt));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Attendance</h1>
            <AttendanceReport records={records} />
        </div>
    );
}
