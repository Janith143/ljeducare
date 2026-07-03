'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Course } from '@ljeducare/shared';
import { formatCurrencyCompact } from '@ljeducare/shared';
import { deleteCourseAction, togglePublishCourseAction } from '@/app/teacher/courses/actions';

export default function CourseListTable({ courses }: { courses: Course[] }) {
    if (!courses.length) {
        return (
            <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                No courses yet — create your first one.
            </p>
        );
    }
    return (
        <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-light-border text-left dark:border-dark-border">
                        <th className="p-3">Course</th>
                        <th className="p-3">Lessons</th>
                        <th className="p-3">Fee</th>
                        <th className="p-3">Status</th>
                        <th className="p-3" />
                    </tr>
                </thead>
                <tbody>
                    {courses.map((course) => (
                        <Row key={course.id} course={course} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Row({ course }: { course: Course }) {
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
                <span className="block font-medium">{course.title}</span>
                <span className="text-xs text-light-subtle dark:text-dark-subtle">{course.subject}</span>
                {error && <span className="block text-xs text-red-600">{error}</span>}
            </td>
            <td className="p-3">{course.lectures?.length ?? 0}</td>
            <td className="p-3 whitespace-nowrap">
                {course.pricing?.isFree || !course.pricing?.basePrice
                    ? 'Free'
                    : formatCurrencyCompact({ amount: course.pricing.basePrice, currency: 'LKR' })}
            </td>
            <td className="p-3">
                <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        course.isPublished
                            ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                >
                    {course.isPublished ? 'Published' : 'Draft'}
                </span>
            </td>
            <td className="space-x-2 p-3 text-right whitespace-nowrap">
                <Link href={`/teacher/courses/${course.id}/edit`} className="btn-secondary px-2 py-1 text-xs">
                    Edit
                </Link>
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => togglePublishCourseAction(course.id, !course.isPublished))}
                    className="btn-secondary px-2 py-1 text-xs"
                >
                    {course.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                        if (window.confirm(`Delete "${course.title}"? It moves to the recycle bin.`)) {
                            run(() => deleteCourseAction(course.id));
                        }
                    }}
                    className="btn-secondary px-2 py-1 text-xs text-red-600"
                >
                    Delete
                </button>
            </td>
        </tr>
    );
}
