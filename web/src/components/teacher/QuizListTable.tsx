'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Quiz } from '@ljeducare/shared';
import { deleteQuizAction, togglePublishQuizAction } from '@/app/teacher/quizzes/actions';

export default function QuizListTable({ quizzes }: { quizzes: Quiz[] }) {
    if (!quizzes.length) {
        return <p className="card text-sm text-light-subtle dark:text-dark-subtle">No quizzes yet.</p>;
    }
    return (
        <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-light-border text-left dark:border-dark-border">
                        <th className="p-3">Quiz</th>
                        <th className="p-3">Scheduled</th>
                        <th className="p-3">Questions</th>
                        <th className="p-3">Status</th>
                        <th className="p-3" />
                    </tr>
                </thead>
                <tbody>
                    {quizzes.map((quiz) => (
                        <Row key={quiz.id} quiz={quiz} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Row({ quiz }: { quiz: Quiz }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function run(action: () => Promise<{ error?: string }>) {
        startTransition(async () => {
            setError(null);
            const result = await action();
            if (result.error) setError(result.error);
            else router.refresh();
        });
    }

    return (
        <tr className="border-b border-light-border dark:border-dark-border">
            <td className="p-3">
                <span className="block font-medium">{quiz.title}</span>
                <span className="text-xs text-light-subtle dark:text-dark-subtle">{quiz.subject}</span>
                {error && <span className="block text-xs text-red-600">{error}</span>}
            </td>
            <td className="p-3 whitespace-nowrap">
                {quiz.date} · {quiz.startTime} · {quiz.durationMinutes} min
            </td>
            <td className="p-3">{quiz.questions?.length ?? 0}</td>
            <td className="p-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${quiz.isPublished ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                    {quiz.isPublished ? 'Published' : 'Draft'}
                </span>
            </td>
            <td className="space-x-2 p-3 text-right whitespace-nowrap">
                <Link href={`/teacher/quizzes/${quiz.id}/edit`} className="btn-secondary px-2 py-1 text-xs">Edit</Link>
                <button type="button" disabled={pending} onClick={() => run(() => togglePublishQuizAction(quiz.id, !quiz.isPublished))} className="btn-secondary px-2 py-1 text-xs">
                    {quiz.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                        if (window.confirm(`Delete "${quiz.title}"?`)) run(() => deleteQuizAction(quiz.id));
                    }}
                    className="btn-secondary px-2 py-1 text-xs text-red-600"
                >
                    Delete
                </button>
            </td>
        </tr>
    );
}
