import { notFound } from 'next/navigation';
import type { LiveClass } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import ClassForm from '@/components/teacher/ClassForm';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function EditClassPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await requireRole('teacher', 'teacher_admin');
    const { id } = await params;

    const doc = await adminDb().collection(COLLECTIONS.CLASSES).doc(id).get();
    if (!doc.exists || doc.data()!.isDeleted) notFound();
    const cls = { ...(doc.data() as LiveClass), id: doc.id };

    if (user.role !== 'teacher_admin') {
        const staff = await getOwnStaffProfile(user);
        if (!staff || cls.teacherId !== staff.id) notFound();
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">Edit class</h1>
            <ClassForm existing={cls} />
        </div>
    );
}
