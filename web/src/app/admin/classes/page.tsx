import ContentTable, { toRows } from '@/components/admin/content/ContentTable';
import { requirePermission } from '@/lib/auth/session';
import { loadAllContent } from '@/lib/data/adminContent';

export const dynamic = 'force-dynamic';

export default async function AdminClassesPage() {
    await requirePermission('classes');
    const { classes, teacherNames } = await loadAllContent();
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Classes</h1>
            <ContentTable rows={toRows(classes, [], teacherNames)} />
        </div>
    );
}
