import Link from 'next/link';
import type { Quiz } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function StudentQuizzesPage() {
    const user = await requireRole('student');
    const db = adminDb();

    const [userDoc, submissionsSnap, quizzesSnap] = await Promise.all([
        db.collection(COLLECTIONS.USERS).doc(user.uid).get(),
        db.collection(COLLECTIONS.SUBMISSIONS).where('studentId', '==', user.uid).get(),
        db.collection(COLLECTIONS.QUIZZES).where('isPublished', '==', true).get(),
    ]);

    const enrolledIds = new Set((userDoc.data()?.enrolledQuizIds ?? []).map(String));
    const scores = new Map(
        submissionsSnap.docs.map((d) => [String(d.data().quizId), d.data() as { score: number; total?: number }]),
    );
    const quizzes = quizzesSnap.docs
        .map((d) => ({ ...(d.data() as Quiz), id: d.id }))
        .filter((q) => !q.isDeleted)
        .filter((q) => enrolledIds.has(q.id) || q.pricing?.isFree || !(q.pricing?.basePrice > 0) || scores.has(q.id))
        .sort((a, b) => a.date.localeCompare(b.date));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">My Quizzes</h1>
            {quizzes.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    {quizzes.map((quiz) => {
                        const submission = scores.get(quiz.id);
                        return (
                            <div key={quiz.id} className="card flex flex-col gap-2">
                                <h2 className="font-semibold">{quiz.title}</h2>
                                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                                    {quiz.subject} · {quiz.date} {quiz.startTime} · {quiz.durationMinutes} min ·{' '}
                                    {quiz.questions?.length ?? 0} questions
                                </p>
                                {submission ? (
                                    <p className="mt-auto text-lg font-bold text-primary">
                                        Score: {submission.score} / {submission.total ?? quiz.questions?.length}
                                    </p>
                                ) : (
                                    <Link href={`/quiz/${quiz.id}/take`} className="btn-primary mt-auto text-center">
                                        Take quiz
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                    No quizzes yet — <Link href="/quizzes" className="text-primary hover:underline">browse available quizzes</Link>.
                </p>
            )}
        </div>
    );
}
