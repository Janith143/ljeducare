import type { LiveClass } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import AttendanceReport, { type AttendanceRecordRow } from '@/components/admin/attendance/AttendanceReport';
import AttendanceMarker, { type ClassOption } from '@/components/attendance/AttendanceMarker';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminAttendancePage() {
    await requirePermission('attendance');

    const [snap, classSnap] = await Promise.all([
        adminDb().collection(COLLECTIONS.ATTENDANCE).get(),
        adminDb().collection(COLLECTIONS.CLASSES).where('isPublished', '==', true).get(),
    ]);

    const classes: ClassOption[] = classSnap.docs
        .map((d) => ({ id: d.id, title: (d.data() as LiveClass).title, deleted: (d.data() as LiveClass).isDeleted }))
        .filter((c) => !c.deleted)
        .map(({ id, title }) => ({ id, title }))
        .sort((a, b) => a.title.localeCompare(b.title));
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
        <div className="space-y-8">
            <section className="space-y-3">
                <div>
                    <h1 className="text-2xl font-bold">Mark attendance</h1>
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">
                        No kiosk needed — pick a class and session date, then mark students by ID or upload an
                        Excel of IDs. Unenrolled students can be taken as cash or marked unpaid.
                    </p>
                </div>
                <AttendanceMarker classes={classes} />
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold">Attendance report</h2>
                <AttendanceReport records={records} />
            </section>
        </div>
    );
}
