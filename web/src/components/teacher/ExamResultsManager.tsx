'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ExamResult } from '@ljeducare/shared';
import { deleteExamResultAction, saveExamResultAction } from '@/app/teacher/exams/actions';

export interface ClassOption {
    id: string;
    title: string;
    examResults: ExamResult[];
    students: { id: string; name: string }[];
}

/** Per-class exam results entry (ported ExamResultEditor essentials). */
export default function ExamResultsManager({ classes }: { classes: ClassOption[] }) {
    const [classId, setClassId] = useState(classes[0]?.id ?? '');
    const selected = classes.find((c) => c.id === classId);

    return (
        <div className="space-y-4">
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input max-w-md">
                {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                ))}
            </select>
            {selected ? (
                <ClassExams key={selected.id} cls={selected} />
            ) : (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">No classes available.</p>
            )}
        </div>
    );
}

function ClassExams({ cls }: { cls: ClassOption }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const [scores, setScores] = useState<Record<string, string>>({});

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        startTransition(async () => {
            setError(null);
            const result = await saveExamResultAction({
                classId: cls.id,
                name: String(f.get('name') ?? ''),
                category: String(f.get('category') ?? ''),
                date: String(f.get('date') ?? ''),
                maxMark: Number(f.get('maxMark') ?? 100),
                studentScores: cls.students
                    .filter((s) => scores[s.id] !== undefined && scores[s.id] !== '')
                    .map((s) => ({ studentId: s.id, score: Number(scores[s.id]) })),
            });
            if (result.error) setError(result.error);
            else {
                setAdding(false);
                setScores({});
                router.refresh();
            }
        });
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold">Exams for {cls.title} ({cls.examResults.length})</h2>
                <button type="button" onClick={() => setAdding((a) => !a)} className="btn-primary px-3 py-1.5 text-sm">
                    {adding ? 'Cancel' : '+ Add exam results'}
                </button>
            </div>

            {adding && (
                <form onSubmit={submit} className="card space-y-3">
                    {error && (
                        <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
                    )}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <input name="name" required placeholder="Exam name" className="input" />
                        <input name="category" required placeholder="Category (Model Papers…)" className="input" />
                        <input name="date" type="date" required className="input" />
                        <input name="maxMark" type="number" min={1} defaultValue={100} required title="Max mark" className="input" />
                    </div>
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                        {cls.students.length ? (
                            cls.students.map((s) => (
                                <label key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-light-border p-2 text-sm dark:border-dark-border">
                                    <span>{s.name}</span>
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="—"
                                        value={scores[s.id] ?? ''}
                                        onChange={(e) => setScores((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                        className="input w-24 py-1"
                                    />
                                </label>
                            ))
                        ) : (
                            <p className="text-sm text-light-subtle dark:text-dark-subtle">No enrolled students yet.</p>
                        )}
                    </div>
                    <button type="submit" disabled={pending} className="btn-primary w-full">
                        {pending ? 'Saving…' : 'Save exam results'}
                    </button>
                </form>
            )}

            {cls.examResults.map((exam) => (
                <div key={exam.id} className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">{exam.name}</p>
                            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                                {exam.category} · {exam.date} · out of {exam.maxMark} · {exam.studentScores.length} students
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={pending}
                            onClick={() => {
                                if (window.confirm(`Delete "${exam.name}" results?`)) {
                                    startTransition(async () => {
                                        await deleteExamResultAction(cls.id, exam.id);
                                        router.refresh();
                                    });
                                }
                            }}
                            className="btn-secondary px-2 py-1 text-xs text-red-600"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ))}
            {!cls.examResults.length && !adding && (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">No exam results recorded yet.</p>
            )}
        </div>
    );
}
