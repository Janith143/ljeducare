import Link from 'next/link';
import ContentTable, { toRows } from '@/components/admin/content/ContentTable';
import { requirePermission } from '@/lib/auth/session';
import { loadAllContent } from '@/lib/data/adminContent';

export const dynamic = 'force-dynamic';

export default async function AdminClassesPage() {
    await requirePermission('classes');
    const { classes, teacherNames } = await loadAllContent();
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">Classes</h1>
                {/* The class form lives in the teaching area; admins/managers may use it
                    and pick the owning teacher there. */}
                <Link href="/teacher/classes/new" className="btn-primary text-sm">
                    + New class
                </Link>
            </div>
            <ContentTable rows={toRows(classes, [], teacherNames)} />
        </div>
    );
}
