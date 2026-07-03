import ContentTable, { toRows } from '@/components/admin/content/ContentTable';
import { requirePermission } from '@/lib/auth/session';
import { loadAllContent } from '@/lib/data/adminContent';

export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage() {
    await requirePermission('courses');
    const { courses, teacherNames } = await loadAllContent();
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Courses</h1>
            <ContentTable rows={toRows([], courses, teacherNames)} />
        </div>
    );
}
