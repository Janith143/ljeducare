import ContentTable, { toRows } from '@/components/admin/content/ContentTable';
import { requirePermission } from '@/lib/auth/session';
import { loadAllContent } from '@/lib/data/adminContent';

export const dynamic = 'force-dynamic';

/** Draft overview — everything not yet visible to students. */
export default async function AdminContentPage() {
    await requirePermission('content');
    const { classes, courses, teacherNames } = await loadAllContent();
    const rows = toRows(
        classes.filter((c) => !c.isPublished),
        courses.filter((c) => !c.isPublished),
        teacherNames,
    );
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Content Review</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Draft classes and courses awaiting publication by their teachers (or a teacher admin).
            </p>
            <ContentTable rows={rows} />
        </div>
    );
}
