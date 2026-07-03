'use client';

import { useRef, useState } from 'react';
import type { Question } from '@ljeducare/shared';
import { downloadQuizTemplate, parseQuestionsFromExcel } from '@/lib/quizTemplate';

/** Question list editor with Excel bulk import (ported QuizEditor pattern). */
export default function QuizQuestionsEditor({
    questions,
    onChange,
}: {
    questions: Question[];
    onChange: (next: Question[]) => void;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);

    function newQuestion(): Question {
        return {
            id: crypto.randomUUID(),
            text: '',
            answers: [
                { id: crypto.randomUUID(), text: '', isCorrect: true },
                { id: crypto.randomUUID(), text: '', isCorrect: false },
            ],
        };
    }

    function patchQuestion(id: string, patch: Partial<Question>) {
        onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    }

    async function handleImport(file: File) {
        setImportError(null);
        try {
            const imported = await parseQuestionsFromExcel(file);
            const replace =
                questions.length > 0 &&
                window.confirm(`Replace the ${questions.length} existing question(s)? Cancel appends instead.`);
            onChange(replace ? imported : [...questions, ...imported]);
        } catch (e: unknown) {
            setImportError((e as Error).message);
        } finally {
            if (fileRef.current) fileRef.current.value = '';
        }
    }

    return (
        <section className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Questions ({questions.length})</h2>
                <div className="flex gap-2">
                    <button type="button" onClick={() => void downloadQuizTemplate()} className="btn-secondary px-3 py-1 text-xs">
                        ⬇ Excel template
                    </button>
                    <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary px-3 py-1 text-xs">
                        ⬆ Import Excel
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && void handleImport(e.target.files[0])}
                    />
                    <button type="button" onClick={() => onChange([...questions, newQuestion()])} className="btn-secondary px-3 py-1 text-xs">
                        + Add question
                    </button>
                </div>
            </div>
            {importError && (
                <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {importError}
                </p>
            )}

            {questions.map((question, qi) => (
                <div key={question.id} className="space-y-2 rounded-lg border border-light-border p-3 dark:border-dark-border">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-light-subtle dark:text-dark-subtle">Question {qi + 1}</span>
                        <button
                            type="button"
                            onClick={() => onChange(questions.filter((q) => q.id !== question.id))}
                            className="text-xs text-red-600 hover:underline"
                        >
                            Remove
                        </button>
                    </div>
                    <textarea
                        rows={2}
                        placeholder="Question text"
                        value={question.text}
                        onChange={(e) => patchQuestion(question.id, { text: e.target.value })}
                        className="input"
                    />
                    <div className="space-y-1">
                        {question.answers.map((answer) => (
                            <div key={answer.id} className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name={`correct-${question.id}`}
                                    title="Correct answer"
                                    checked={answer.isCorrect}
                                    onChange={() =>
                                        patchQuestion(question.id, {
                                            answers: question.answers.map((a) => ({ ...a, isCorrect: a.id === answer.id })),
                                        })
                                    }
                                />
                                <input
                                    placeholder="Option text"
                                    value={answer.text}
                                    onChange={(e) =>
                                        patchQuestion(question.id, {
                                            answers: question.answers.map((a) =>
                                                a.id === answer.id ? { ...a, text: e.target.value } : a,
                                            ),
                                        })
                                    }
                                    className="input flex-1 py-1"
                                />
                                {question.answers.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            patchQuestion(question.id, {
                                                answers: question.answers.filter((a) => a.id !== answer.id),
                                            })
                                        }
                                        className="text-xs text-red-600"
                                        aria-label="Remove option"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        {question.answers.length < 5 && (
                            <button
                                type="button"
                                onClick={() =>
                                    patchQuestion(question.id, {
                                        answers: [...question.answers, { id: crypto.randomUUID(), text: '', isCorrect: false }],
                                    })
                                }
                                className="text-xs text-primary hover:underline"
                            >
                                + Add option
                            </button>
                        )}
                    </div>
                </div>
            ))}
            {!questions.length && (
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    No questions yet — add one or import from Excel.
                </p>
            )}
        </section>
    );
}
