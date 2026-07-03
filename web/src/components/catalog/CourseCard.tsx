import Link from 'next/link';
import type { Course, CurrencySettings } from '@ljeducare/shared';
import PriceTag from './PriceTag';

/** Public course card — a real link to /courses/[slug]. */
export default function CourseCard({
    course,
    settings,
}: {
    course: Course;
    settings: CurrencySettings;
}) {
    const lectureCount = course.lectures?.length ?? 0;
    return (
        <Link href={`/courses/${course.slug}`} className="card group flex flex-col gap-2 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold group-hover:text-primary">{course.title}</h3>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {course.type === 'recorded' ? 'Recorded' : 'Live'}
                </span>
            </div>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                {course.subject}
                {course.grade ? ` · ${course.grade}` : ''}
                {lectureCount ? ` · ${lectureCount} lessons` : ''}
            </p>
            <p className="line-clamp-2 text-sm text-light-subtle dark:text-dark-subtle">{course.description}</p>
            <div className="mt-auto flex items-center justify-between pt-2">
                <PriceTag pricing={course.pricing} settings={settings} />
                <span className="text-sm font-medium text-primary">View course →</span>
            </div>
        </Link>
    );
}
