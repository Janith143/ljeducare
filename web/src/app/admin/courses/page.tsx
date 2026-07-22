import Link from 'next/link';
import ContentTable, { toRows } from '@/components/admin/content/ContentTable';
import { requirePermission } from '@/lib/auth/session';
import { loadAllContent } from '@/lib/data/adminContent';

export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage() {
    await requirePermission('courses');
    const { courses, teacherNames } = await loadAllContent();
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">Courses</h1>
                {/* The course form lives in the teaching area; admins/managers may use it
                    and pick the owning teacher there. */}
                <Link href="/teacher/courses/new" className="btn-primary text-sm">
                    + New course
                </Link>
            </div>
            <ContentTable rows={toRows([], courses, teacherNames)} />
        </div>
    );
}
