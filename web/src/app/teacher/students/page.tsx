import type { LiveClass, User } from '@ljeducare/shared';
import { COLLECTIONS, TEACHING_ROLES } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile, listTeacherClasses } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/** Roster of students enrolled in this teacher's classes. */
export default async function TeacherStudentsPage() {
    const user = await requireRole(...TEACHING_ROLES);
    const staff = await getOwnStaffProfile(user);
    const classes = await listTeacherClasses(user, staff?.id ?? null);
    const classIds = new Set(classes.map((c: LiveClass) => c.id));
    const classTitle = new Map(classes.map((c: LiveClass) => [c.id, c.title]));

    const studentsSnap = await adminDb().collection(COLLECTIONS.USERS).where('role', '==', 'student').get();
    const rows = studentsSnap.docs
        .map((d) => ({ ...(d.data() as User), id: d.id }))
        .map((s) => ({
            student: s,
            enrolledIn: (s.enrolledClassIds ?? []).map(String).filter((cid) => classIds.has(cid)),
        }))
        .filter((r) => r.enrolledIn.length > 0)
        .sort((a, b) => `${a.student.firstName}`.localeCompare(`${b.student.firstName}`));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">My Students</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                {rows.length} students enrolled across your {classes.length} classes.
            </p>
            {rows.length ? (
                <div className="card overflow-x-auto p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-light-border text-left dark:border-dark-border">
                                <th className="p-3">Student</th>
                                <th className="p-3">Contact</th>
                                <th className="p-3">Guardian</th>
                                <th className="p-3">Enrolled classes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({ student, enrolledIn }) => (
                                <tr key={student.id} className="border-b border-light-border dark:border-dark-border">
                                    <td className="p-3 font-medium">{student.firstName} {student.lastName}</td>
                                    <td className="p-3 text-light-subtle dark:text-dark-subtle">{student.contactNumber || student.email}</td>
                                    <td className="p-3 text-light-subtle dark:text-dark-subtle">{student.guardianPhone || '—'}</td>
                                    <td className="p-3">{enrolledIn.map((cid) => classTitle.get(cid)).join(', ')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">No enrolled students yet.</p>
            )}
        </div>
    );
}
