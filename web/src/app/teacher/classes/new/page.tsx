import ClassForm from '@/components/teacher/ClassForm';
import { requireRole } from '@/lib/auth/session';
import { CONTENT_ROLES, assignsTeacher } from '@/lib/auth/contentRoles';
import { listCategories } from '@/lib/data/categories';
import { listStaff } from '@/lib/data/staff';

export const dynamic = 'force-dynamic';

export default async function NewClassPage() {
    const user = await requireRole(...CONTENT_ROLES);
    const categories = (await listCategories()).map((c) => ({ slug: c.slug, name: c.name }));

    // Admins/managers/teacher_admins nominate the owning teacher; a teacher owns their own.
    const teachers = assignsTeacher(user.role)
        ? (await listStaff()).map((s) => ({ id: s.id, name: s.name }))
        : undefined;

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">Schedule a class</h1>
            <ClassForm categories={categories} teachers={teachers} />
        </div>
    );
}
