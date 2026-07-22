'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Course } from '@ljeducare/shared';
import { saveCourseAction, type CourseFormInput } from '@/app/teacher/courses/actions';
import CategorySelect, { type CategoryOpt } from '@/components/teacher/CategorySelect';

type LectureRow = CourseFormInput['lectures'][number] & { key: string };

/** Create/edit form for a recorded course with an inline lessons editor. */
export interface TeacherOpt {
    id: string;
    name: string;
}

export default function CourseForm({
    existing,
    categories = [],
    teachers,
}: {
    existing?: Course;
    categories?: CategoryOpt[];
    /** Supplied only when the author isn't a teacher — they nominate the owning teacher. */
    teachers?: TeacherOpt[];
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [isFree, setIsFree] = useState(existing?.pricing?.isFree ?? false);
    const [lectures, setLectures] = useState<LectureRow[]>(
        existing?.lectures?.map((l, i) => ({
            key: l.id || `k${i}`,
            id: l.id,
            title: l.title,
            videoUrl: l.videoUrl,
            durationMinutes: l.durationMinutes,
            isFreePreview: l.isFreePreview,
        })) ?? [{ key: 'k0', title: '', videoUrl: '', durationMinutes: 30, isFreePreview: true }],
    );

    function updateLecture(key: string, patch: Partial<LectureRow>) {
        setLectures((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const input: CourseFormInput = {
            id: existing?.id,
            ...(teachers ? { teacherId: String(f.get('teacherId') ?? '') } : {}),
            title: String(f.get('title') ?? ''),
            subject: String(f.get('subject') ?? ''),
            description: String(f.get('description') ?? ''),
            isFree,
            basePrice: Number(f.get('basePrice') ?? 0),
            usdOverride: f.get('usdOverride') ? Number(f.get('usdOverride')) : null,
            medium: String(f.get('medium') ?? ''),
            grade: String(f.get('grade') ?? ''),
            categorySlug: String(f.get('categorySlug') ?? ''),
            category: categories.find((c) => c.slug === String(f.get('categorySlug') ?? ''))?.name ?? '',
            lectures: lectures.map(({ key, ...l }) => (void key, l)),
        };
        startTransition(async () => {
            const result = await saveCourseAction(input);
            if (result.error) setError(result.error);
            else {
                // See ClassForm: `teachers` marks an admin/manager author.
                router.push(teachers ? '/admin/courses' : '/teacher/courses');
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
                <h2 className="font-semibold">Course details</h2>
                {/* Only shown to admins/managers — a teacher always owns what they create. */}
                {teachers && (
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium">Teacher</span>
                        <select name="teacherId" required defaultValue={existing?.teacherId ?? ''} className="input">
                            <option value="" disabled>
                                Choose the teacher…
                            </option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                        <span className="mt-1 block text-xs text-light-subtle dark:text-dark-subtle">
                            Who teaches this course. Shown on the public page and used for their earnings.
                        </span>
                    </label>
                )}

                <input name="title" required placeholder="Course title" defaultValue={existing?.title} className="input" />
                <div className="grid grid-cols-3 gap-3">
                    <input name="subject" required placeholder="Subject" defaultValue={existing?.subject} className="input" />
                    <input name="medium" placeholder="Medium" defaultValue={existing?.medium} className="input" />
                    <input name="grade" placeholder="Grade" defaultValue={existing?.grade} className="input" />
                </div>
                <CategorySelect categories={categories} defaultSlug={existing?.categorySlug} defaultName={existing?.category} />
                <textarea name="description" rows={4} placeholder="Description" defaultValue={existing?.description} className="input" />
            </section>

            <section className="card space-y-3">
                <h2 className="font-semibold">Pricing</h2>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
                    This course is free
                </label>
                {!isFree && (
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm">
                            <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Fee (LKR)</span>
                            <input name="basePrice" type="number" min={0} step="0.01" defaultValue={existing?.pricing?.basePrice || ''} className="input" />
                        </label>
                        <label className="block text-sm">
                            <span className="mb-1 block text-light-subtle dark:text-dark-subtle">USD price (optional override)</span>
                            <input name="usdOverride" type="number" min={0} step="0.01" defaultValue={existing?.pricing?.overrides?.USD || ''} className="input" />
                        </label>
                    </div>
                )}
            </section>

            <section className="card space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold">Lessons ({lectures.length})</h2>
                    <button
                        type="button"
                        onClick={() =>
                            setLectures((rows) => [
                                ...rows,
                                { key: `k${Date.now()}`, title: '', videoUrl: '', durationMinutes: 30, isFreePreview: false },
                            ])
                        }
                        className="btn-secondary px-3 py-1 text-xs"
                    >
                        + Add lesson
                    </button>
                </div>
                {lectures.map((lecture, i) => (
                    <div key={lecture.key} className="space-y-2 rounded-lg border border-light-border p-3 dark:border-dark-border">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-light-subtle dark:text-dark-subtle">Lesson {i + 1}</span>
                            {lectures.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setLectures((rows) => rows.filter((r) => r.key !== lecture.key))}
                                    className="text-xs text-red-600 hover:underline"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                        <input
                            placeholder="Lesson title"
                            value={lecture.title}
                            onChange={(e) => updateLecture(lecture.key, { title: e.target.value })}
                            className="input"
                        />
                        <div className="grid grid-cols-[1fr_110px_auto] items-center gap-2">
                            <input
                                type="url"
                                placeholder="Video URL (YouTube unlisted / Bunny)"
                                value={lecture.videoUrl}
                                onChange={(e) => updateLecture(lecture.key, { videoUrl: e.target.value })}
                                className="input"
                            />
                            <input
                                type="number"
                                min={0}
                                title="Duration (minutes)"
                                value={lecture.durationMinutes}
                                onChange={(e) => updateLecture(lecture.key, { durationMinutes: Number(e.target.value) })}
                                className="input"
                            />
                            <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                                <input
                                    type="checkbox"
                                    checked={lecture.isFreePreview}
                                    onChange={(e) => updateLecture(lecture.key, { isFreePreview: e.target.checked })}
                                />
                                Free preview
                            </label>
                        </div>
                    </div>
                ))}
            </section>

            <button type="submit" disabled={pending} className="btn-primary w-full py-3">
                {pending ? 'Saving…' : existing ? 'Save changes' : 'Create course'}
            </button>
        </form>
    );
}
