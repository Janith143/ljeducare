import { notFound } from 'next/navigation';
import type { Course } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import CourseForm from '@/components/teacher/CourseForm';
import { requireRole } from '@/lib/auth/session';
import { CONTENT_ROLES, assignsTeacher } from '@/lib/auth/contentRoles';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { listCategories } from '@/lib/data/categories';
import { listStaff } from '@/lib/data/staff';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function EditCoursePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await requireRole(...CONTENT_ROLES);
    const { id } = await params;

    const doc = await adminDb().collection(COLLECTIONS.COURSES).doc(id).get();
    if (!doc.exists || doc.data()!.isDeleted) notFound();
    const course = { ...(doc.data() as Course), id: doc.id };

    if (!assignsTeacher(user.role)) {
        const staff = await getOwnStaffProfile(user);
        if (!staff || course.teacherId !== staff.id) notFound();
    }

    const categories = (await listCategories()).map((c) => ({ slug: c.slug, name: c.name }));
    // Admins/managers/teacher_admins may (re)assign the owning teacher.
    const teachers = assignsTeacher(user.role)
        ? (await listStaff()).map((s) => ({ id: s.id, name: s.name }))
        : undefined;

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">Edit course</h1>
            <CourseForm existing={course} categories={categories} teachers={teachers} />
        </div>
    );
}
