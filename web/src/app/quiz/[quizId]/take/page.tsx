import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Quiz } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import QuizTakeClient from '@/components/quiz/QuizTakeClient';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/** Full-screen quiz-taking page. isCorrect flags NEVER leave the server. */
export default async function QuizTakePage({
    params,
}: {
    params: Promise<{ quizId: string }>;
}) {
    const user = await requireRole('student');
    const { quizId } = await params;

    const db = adminDb();
    const [quizDoc, userDoc, submissionDoc] = await Promise.all([
        db.collection(COLLECTIONS.QUIZZES).doc(quizId).get(),
        db.collection(COLLECTIONS.USERS).doc(user.uid).get(),
        db.collection(COLLECTIONS.SUBMISSIONS).doc(`${quizId}_${user.uid}`).get(),
    ]);
    if (!quizDoc.exists || quizDoc.data()!.isDeleted || !quizDoc.data()!.isPublished) notFound();
    const quiz = { ...(quizDoc.data() as Quiz), id: quizDoc.id };

    if (submissionDoc.exists) {
        const sub = submissionDoc.data()!;
        return (
            <ResultShell title={quiz.title}>
                <p className="text-4xl font-bold text-primary">
                    {sub.score} / {sub.total ?? quiz.questions.length}
                </p>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Submitted {new Date(sub.submittedAt).toLocaleString()}. One attempt per student.
                </p>
            </ResultShell>
        );
    }

    const isFree = quiz.pricing?.isFree || !(quiz.pricing?.basePrice > 0);
    const enrolled = (userDoc.data()?.enrolledQuizIds ?? []).map(String).includes(quizId);
    if (!isFree && !enrolled) {
        return (
            <ResultShell title={quiz.title}>
                <p className="text-light-subtle dark:text-dark-subtle">
                    You need to enroll before taking this quiz.
                </p>
                <Link href={`/checkout/quiz/${quiz.id}`} className="btn-primary px-8 py-3">
                    Enroll now
                </Link>
            </ResultShell>
        );
    }

    // Strip correctness before anything reaches the client.
    const safeQuestions = quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        imageUrl: q.imageUrl,
        answers: q.answers.map((a) => ({ id: a.id, text: a.text })),
    }));

    return (
        <div className="min-h-screen bg-light-background p-4 dark:bg-dark-background">
            <QuizTakeClient
                quizId={quiz.id}
                title={quiz.title}
                durationMinutes={quiz.durationMinutes}
                questions={safeQuestions}
            />
        </div>
    );
}

function ResultShell({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
            <h1 className="text-2xl font-bold">{title}</h1>
            {children}
            <Link href="/student/quizzes" className="btn-secondary">
                ← Back to my quizzes
            </Link>
        </div>
    );
}
