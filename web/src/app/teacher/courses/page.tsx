import Link from 'next/link';
import CourseListTable from '@/components/teacher/CourseListTable';
import { requireRole } from '@/lib/auth/session';
import { CONTENT_ROLES } from '@/lib/auth/contentRoles';
import { getOwnStaffProfile, listTeacherCourses } from '@/lib/data/teacher';

export const dynamic = 'force-dynamic';

export default async function TeacherCoursesPage() {
    // Same as /teacher/classes: admins/managers author here and land here on save.
    const user = await requireRole(...CONTENT_ROLES);
    const staff = await getOwnStaffProfile(user);
    const courses = await listTeacherCourses(user, staff?.id ?? null);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    {user.role === 'teacher' ? 'My Courses' : 'All Courses'}
                </h1>
                <Link href="/teacher/courses/new" className="btn-primary">
                    + Create a course
                </Link>
            </div>
            <CourseListTable courses={courses} />
        </div>
    );
}
