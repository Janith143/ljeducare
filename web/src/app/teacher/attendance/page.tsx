import AttendanceMarker, { type ClassOption } from '@/components/attendance/AttendanceMarker';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile, listTeacherClasses } from '@/lib/data/teacher';

export const dynamic = 'force-dynamic';

export default async function TeacherAttendancePage() {
    const user = await requireRole('teacher', 'teacher_admin');
    const staff = await getOwnStaffProfile(user);
    const classes = await listTeacherClasses(user, staff?.id ?? null);

    const options: ClassOption[] = classes
        .map((c) => ({ id: c.id, title: c.title }))
        .sort((a, b) => a.title.localeCompare(b.title));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Mark attendance</h1>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Pick one of your classes and a session date, then mark students by ID or upload an Excel of
                    IDs — no kiosk required. Unenrolled students can be taken as cash or marked unpaid.
                </p>
            </div>
            <AttendanceMarker classes={options} />
        </div>
    );
}
