'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, Quiz } from '@ljeducare/shared';
import { saveQuizAction, type QuizFormInput } from '@/app/teacher/quizzes/actions';
import QuizQuestionsEditor from './QuizQuestionsEditor';

/** Create/edit form for a timed quiz. */
export default function QuizForm({ existing }: { existing?: Quiz }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [isFree, setIsFree] = useState(existing?.pricing?.isFree ?? true);
    const [questions, setQuestions] = useState<Question[]>(existing?.questions ?? []);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const input: QuizFormInput = {
            id: existing?.id,
            title: String(f.get('title') ?? ''),
            subject: String(f.get('subject') ?? ''),
            description: String(f.get('description') ?? ''),
            date: String(f.get('date') ?? ''),
            startTime: String(f.get('startTime') ?? ''),
            durationMinutes: Number(f.get('durationMinutes') ?? 30),
            isFree,
            basePrice: Number(f.get('basePrice') ?? 0),
            usdOverride: f.get('usdOverride') ? Number(f.get('usdOverride')) : null,
            medium: String(f.get('medium') ?? ''),
            grade: String(f.get('grade') ?? ''),
            questions,
        };
        startTransition(async () => {
            const result = await saveQuizAction(input);
            if (result.error) setError(result.error);
            else {
                router.push('/teacher/quizzes');
                router.refresh();
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}

            <section className="card space-y-3">
                <h2 className="font-semibold">Quiz details</h2>
                <input name="title" required placeholder="Quiz title" defaultValue={existing?.title} className="input" />
                <div className="grid grid-cols-3 gap-3">
                    <input name="subject" required placeholder="Subject" defaultValue={existing?.subject} className="input" />
                    <input name="medium" placeholder="Medium" defaultValue={existing?.medium} className="input" />
                    <input name="grade" placeholder="Grade" defaultValue={existing?.grade} className="input" />
                </div>
                <textarea name="description" rows={3} placeholder="Description" defaultValue={existing?.description} className="input" />
                <div className="grid grid-cols-3 gap-3">
                    <label className="block text-sm">
                        <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Date</span>
                        <input name="date" type="date" required defaultValue={existing?.date} className="input" />
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Start time</span>
                        <input name="startTime" type="time" required defaultValue={existing?.startTime} className="input" />
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Duration (min)</span>
                        <input name="durationMinutes" type="number" min={1} required defaultValue={existing?.durationMinutes ?? 30} className="input" />
                    </label>
                </div>
            </section>

            <section className="card space-y-3">
                <h2 className="font-semibold">Pricing</h2>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
                    This quiz is free
                </label>
                {!isFree && (
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm">
                            <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Fee (LKR)</span>
                            <input name="basePrice" type="number" min={0} step="0.01" defaultValue={existing?.pricing?.basePrice || ''} className="input" />
                        </label>
                        <label className="block text-sm">
                            <span className="mb-1 block text-light-subtle dark:text-dark-subtle">USD price (optional)</span>
                            <input name="usdOverride" type="number" min={0} step="0.01" defaultValue={existing?.pricing?.overrides?.USD || ''} className="input" />
                        </label>
                    </div>
                )}
            </section>

            <QuizQuestionsEditor questions={questions} onChange={setQuestions} />

            <button type="submit" disabled={pending} className="btn-primary w-full py-3">
                {pending ? 'Saving…' : existing ? 'Save changes' : 'Create quiz'}
            </button>
        </form>
    );
}
