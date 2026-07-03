import type { Metadata } from 'next';
import CourseCard from '@/components/catalog/CourseCard';
import { listPublishedCourses } from '@/lib/data/catalog';
import { getCurrencySettings } from '@/lib/data/currencies';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Courses',
    description: 'Self-paced recorded courses and structured live courses.',
};

export default async function CoursesPage() {
    const [courses, settings] = await Promise.all([listPublishedCourses(), getCurrencySettings()]);

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">Courses</h1>
                <p className="text-light-subtle dark:text-dark-subtle">
                    Learn at your own pace with recorded lessons, or join structured live courses.
                </p>
            </header>

            {courses.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => (
                        <CourseCard key={course.id} course={course} settings={settings} />
                    ))}
                </div>
            ) : (
                <p className="card text-light-subtle dark:text-dark-subtle">
                    No courses published yet — check back soon.
                </p>
            )}
        </div>
    );
}
