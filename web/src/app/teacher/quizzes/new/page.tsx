import QuizForm from '@/components/teacher/QuizForm';
import { requireRole } from '@/lib/auth/session';
import { listCategories } from '@/lib/data/categories';

export const dynamic = 'force-dynamic';

export default async function NewQuizPage() {
    await requireRole('teacher', 'teacher_admin');
    const categories = (await listCategories()).map((c) => ({ slug: c.slug, name: c.name }));
    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">Create a quiz</h1>
            <QuizForm categories={categories} />
        </div>
    );
}
