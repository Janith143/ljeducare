'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import SecureVideoPlayer from '@/components/player/SecureVideoPlayer';

export interface CourseLesson {
    id: string;
    title: string;
    videoUrl: string;
    durationMinutes: number;
}

/**
 * Lesson list + protected player for an enrolled course. One of these renders per
 * enrolled course on /student/courses, so it starts collapsed (no lesson selected) —
 * a student with several courses would otherwise get several YouTube players all
 * loading at once on page load, which is both slow and a wall of unwanted video.
 * Clicking a lesson opens it; clicking the open lesson again closes it.
 */
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
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = lessons.find((l) => l.id === selectedId) ?? null;

    function toggleLesson(lesson: CourseLesson) {
        setSelectedId((prev) => (prev === lesson.id ? null : lesson.id));
    }

    return (
        <div className="card space-y-3">
            <h2 className="font-semibold">{title}</h2>
            {selected && (
                <SecureVideoPlayer url={selected.videoUrl} watermark={watermark} title={`${title} — ${selected.title}`} />
            )}
            {playable.length === 0 && (
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
                                onClick={() => toggleLesson(lesson)}
                                className={`flex w-full items-center justify-between gap-3 py-2 text-left text-sm disabled:opacity-50 ${active ? 'font-semibold text-primary' : ''}`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-light-subtle dark:text-dark-subtle">{i + 1}.</span>
                                    {canPlay && <Play className="h-3.5 w-3.5 shrink-0" fill={active ? 'currentColor' : 'none'} />}
                                    {lesson.title}
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
