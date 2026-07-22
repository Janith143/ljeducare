import type { User } from '@ljeducare/shared';
import { COLLECTIONS, TEACHING_ROLES } from '@ljeducare/shared';
import ExamResultsManager, { type ClassOption } from '@/components/teacher/ExamResultsManager';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile, listTeacherClasses } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function TeacherExamsPage() {
    const user = await requireRole(...TEACHING_ROLES);
    const staff = await getOwnStaffProfile(user);
    const classes = await listTeacherClasses(user, staff?.id ?? null);

    // Enrolled-student roster per class (from users.enrolledClassIds).
    const studentsSnap = await adminDb()
        .collection(COLLECTIONS.USERS)
        .where('role', '==', 'student')
        .get();
    const students = studentsSnap.docs.map((d) => ({ ...(d.data() as User), id: d.id }));

    const options: ClassOption[] = classes.map((cls) => ({
        id: cls.id,
        title: cls.title,
        examResults: cls.examResults ?? [],
        students: students
            .filter((s) => (s.enrolledClassIds ?? []).map(String).includes(cls.id))
            .map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`.trim() })),
    }));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Exam Results</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Record offline exam marks per class — students see them on their score card.
            </p>
            {options.length ? (
                <ExamResultsManager classes={options} />
            ) : (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">Create a class first.</p>
            )}
        </div>
    );
}
