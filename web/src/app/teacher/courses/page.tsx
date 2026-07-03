import Link from 'next/link';
import CourseListTable from '@/components/teacher/CourseListTable';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile, listTeacherCourses } from '@/lib/data/teacher';

export const dynamic = 'force-dynamic';

export default async function TeacherCoursesPage() {
    const user = await requireRole('teacher', 'teacher_admin');
    const staff = await getOwnStaffProfile(user);
    const courses = await listTeacherCourses(user, staff?.id ?? null);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    {user.role === 'teacher_admin' ? 'All Courses' : 'My Courses'}
                </h1>
                <Link href="/teacher/courses/new" className="btn-primary">
                    + Create a course
                </Link>
            </div>
            <CourseListTable courses={courses} />
        </div>
    );
}
