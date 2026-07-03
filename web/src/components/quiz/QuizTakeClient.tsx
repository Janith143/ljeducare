'use client';

import { useEffect, useRef, useState } from 'react';
import { callFunction } from '@/lib/firebase/client';

interface SafeQuestion {
    id: string;
    text: string;
    imageUrl?: string;
    answers: { id: string; text: string }[];
}

/** Timed quiz runner — auto-submits when the clock runs out. */
export default function QuizTakeClient({
    quizId,
    title,
    durationMinutes,
    questions,
}: {
    quizId: string;
    title: string;
    durationMinutes: number;
    questions: SafeQuestion[];
}) {
    const [selected, setSelected] = useState<Record<string, string>>({});
    const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
    const [result, setResult] = useState<{ score: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const submittedRef = useRef(false);

    async function submit() {
        if (submittedRef.current) return;
        submittedRef.current = true;
        setBusy(true);
        setError(null);
        try {
            const res = await callFunction<
                { quizId: string; answers: { questionId: string; selectedAnswerIds: string[] }[] },
                { score: number; total: number }
            >('submitQuiz', {
                quizId,
                answers: Object.entries(selected).map(([questionId, answerId]) => ({
                    questionId,
                    selectedAnswerIds: [answerId],
                })),
            });
            setResult(res);
        } catch (e: unknown) {
            submittedRef.current = false;
            setError((e as Error)?.message ?? 'Submission failed — try again.');
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        if (result) return;
        const timer = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) {
                    clearInterval(timer);
                    void submit(); // time's up
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result]);

    if (result) {
        return (
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</span>
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="text-5xl font-bold text-primary">
                    {result.score} / {result.total}
                </p>
                <a href="/student/quizzes" className="btn-primary">Back to my quizzes</a>
            </div>
        );
    }

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = String(secondsLeft % 60).padStart(2, '0');
    const answered = Object.keys(selected).length;

    return (
        <div className="mx-auto max-w-2xl space-y-4 pb-24">
            <header className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-light-border bg-light-surface p-4 dark:border-dark-border dark:bg-dark-surface">
                <div>
                    <h1 className="font-bold">{title}</h1>
                    <p className="text-xs text-light-subtle dark:text-dark-subtle">
                        {answered}/{questions.length} answered
                    </p>
                </div>
                <span className={`rounded-lg px-3 py-1.5 font-mono text-lg font-bold ${secondsLeft < 60 ? 'animate-shake bg-red-100 text-red-700' : 'bg-primary/10 text-primary'}`}>
                    {minutes}:{seconds}
                </span>
            </header>

            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}

            {questions.map((question, qi) => (
                <fieldset key={question.id} className="card space-y-2">
                    <legend className="font-medium">
                        {qi + 1}. {question.text}
                    </legend>
                    {question.answers.map((answer) => (
                        <label
                            key={answer.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors ${
                                selected[question.id] === answer.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-light-border dark:border-dark-border'
                            }`}
                        >
                            <input
                                type="radio"
                                name={question.id}
                                checked={selected[question.id] === answer.id}
                                onChange={() => setSelected((s) => ({ ...s, [question.id]: answer.id }))}
                            />
                            {answer.text}
                        </label>
                    ))}
                </fieldset>
            ))}

            <button type="button" onClick={() => void submit()} disabled={busy} className="btn-primary w-full py-3">
                {busy ? 'Submitting…' : `Submit (${answered}/${questions.length} answered)`}
            </button>
        </div>
    );
}
