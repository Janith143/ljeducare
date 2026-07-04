import { notFound } from 'next/navigation';
import type { Course } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import CourseForm from '@/components/teacher/CourseForm';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { listCategories } from '@/lib/data/categories';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function EditCoursePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await requireRole('teacher', 'teacher_admin');
    const { id } = await params;

    const doc = await adminDb().collection(COLLECTIONS.COURSES).doc(id).get();
    if (!doc.exists || doc.data()!.isDeleted) notFound();
    const course = { ...(doc.data() as Course), id: doc.id };

    if (user.role !== 'teacher_admin') {
        const staff = await getOwnStaffProfile(user);
        if (!staff || course.teacherId !== staff.id) notFound();
    }

    const categories = (await listCategories()).map((c) => ({ slug: c.slug, name: c.name }));

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">Edit course</h1>
            <CourseForm existing={course} categories={categories} />
        </div>
    );
}
