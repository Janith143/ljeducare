import { notFound } from 'next/navigation';
import type { Quiz } from '@ljeducare/shared';
import { COLLECTIONS, TEACHING_ROLES } from '@ljeducare/shared';
import QuizForm from '@/components/teacher/QuizForm';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { listCategories } from '@/lib/data/categories';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function EditQuizPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await requireRole(...TEACHING_ROLES);
    const { id } = await params;

    const doc = await adminDb().collection(COLLECTIONS.QUIZZES).doc(id).get();
    if (!doc.exists || doc.data()!.isDeleted) notFound();
    const quiz = { ...(doc.data() as Quiz), id: doc.id };

    if (user.role !== 'teacher_admin') {
        const staff = await getOwnStaffProfile(user);
        if (!staff || quiz.teacherId !== staff.id) notFound();
    }

    const categories = (await listCategories()).map((c) => ({ slug: c.slug, name: c.name }));

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">Edit quiz</h1>
            <QuizForm existing={quiz} categories={categories} />
        </div>
    );
}
