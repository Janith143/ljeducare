import ClassForm from '@/components/teacher/ClassForm';
import { requireRole } from '@/lib/auth/session';
import { listCategories } from '@/lib/data/categories';

export const dynamic = 'force-dynamic';

export default async function NewClassPage() {
    await requireRole('teacher', 'teacher_admin');
    const categories = (await listCategories()).map((c) => ({ slug: c.slug, name: c.name }));
    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">Schedule a class</h1>
            <ClassForm categories={categories} />
        </div>
    );
}
