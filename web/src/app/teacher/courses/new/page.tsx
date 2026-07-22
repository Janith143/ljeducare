import CourseForm from '@/components/teacher/CourseForm';
import { requireRole } from '@/lib/auth/session';
import { CONTENT_ROLES, assignsTeacher } from '@/lib/auth/contentRoles';
import { listCategories } from '@/lib/data/categories';
import { listStaff } from '@/lib/data/staff';

export const dynamic = 'force-dynamic';

export default async function NewCoursePage() {
    const user = await requireRole(...CONTENT_ROLES);
    const categories = (await listCategories()).map((c) => ({ slug: c.slug, name: c.name }));
    // Admins/managers/teacher_admins may (re)assign the owning teacher.
    const teachers = assignsTeacher(user.role)
        ? (await listStaff()).map((s) => ({ id: s.id, name: s.name }))
        : undefined;
    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">Create a course</h1>
            <CourseForm categories={categories} teachers={teachers} />
        </div>
    );
}
