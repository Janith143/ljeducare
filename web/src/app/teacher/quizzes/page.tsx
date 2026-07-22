import Link from 'next/link';
import type { Quiz } from '@ljeducare/shared';
import { COLLECTIONS, TEACHING_ROLES } from '@ljeducare/shared';
import QuizListTable from '@/components/teacher/QuizListTable';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function TeacherQuizzesPage() {
    const user = await requireRole(...TEACHING_ROLES);
    const staff = await getOwnStaffProfile(user);
    const staffId = staff?.id ?? null;

    const db = adminDb();
    const query =
        user.role === 'teacher_admin'
            ? db.collection(COLLECTIONS.QUIZZES)
            : db.collection(COLLECTIONS.QUIZZES).where('teacherId', '==', staffId ?? '__none__');
    const snap = await query.get();
    const quizzes = snap.docs
        .map((d) => ({ ...(d.data() as Quiz), id: d.id }))
        .filter((q) => !q.isDeleted)
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{user.role === 'teacher_admin' ? 'All Quizzes' : 'My Quizzes'}</h1>
                <Link href="/teacher/quizzes/new" className="btn-primary">+ Create a quiz</Link>
            </div>
            <QuizListTable quizzes={quizzes} />
        </div>
    );
}
