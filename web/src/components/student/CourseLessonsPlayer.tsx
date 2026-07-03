'use client';

import { useState } from 'react';
import SecureVideoPlayer from '@/components/player/SecureVideoPlayer';

export interface CourseLesson {
    id: string;
    title: string;
    videoUrl: string;
    durationMinutes: number;
}

/** Lesson list + protected player for an enrolled course. */
export default function CourseLessonsPlayer({
    title,
    lessons,
    watermark,
}: {
    title: string;
    lessons: CourseLesson[];
    watermark: string;
}) {
    const playable = lessons.filter((l) => l.videoUrl);
    const [selected, setSelected] = useState<CourseLesson | null>(playable[0] ?? null);

    return (
        <div className="card space-y-3">
            <h2 className="font-semibold">{title}</h2>
            {selected ? (
                <SecureVideoPlayer url={selected.videoUrl} watermark={watermark} title={`${title} — ${selected.title}`} />
            ) : (
                <p className="text-sm text-light-subtle dark:text-dark-subtle">Lessons for this course aren&apos;t uploaded yet.</p>
            )}
            <ol className="divide-y divide-light-border dark:divide-dark-border">
                {lessons.map((lesson, i) => {
                    const active = selected?.id === lesson.id;
                    const canPlay = !!lesson.videoUrl;
                    return (
                        <li key={lesson.id}>
                            <button
                                type="button"
                                disabled={!canPlay}
                                onClick={() => setSelected(lesson)}
                                className={`flex w-full items-center justify-between gap-3 py-2 text-left text-sm disabled:opacity-50 ${active ? 'font-semibold text-primary' : ''}`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-light-subtle dark:text-dark-subtle">{i + 1}.</span>
                                    {active ? '▶ ' : ''}{lesson.title}
                                </span>
                                <span className="text-xs text-light-subtle dark:text-dark-subtle">{lesson.durationMinutes} min</span>
                            </button>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
