import type { Metadata } from 'next';
import CourseCard from '@/components/catalog/CourseCard';
import CategoryFilterBar from '@/components/catalog/CategoryFilterBar';
import { listPublishedCourses } from '@/lib/data/catalog';
import { getCurrencySettings } from '@/lib/data/currencies';
import { itemInCategory, listCategories } from '@/lib/data/categories';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Courses',
    description: 'Self-paced recorded courses and structured live courses.',
};

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
    const { cat } = await searchParams;
    const [courses, settings, categories] = await Promise.all([
        listPublishedCourses(),
        getCurrencySettings(),
        listCategories(),
    ]);
    const activeCat = categories.find((c) => c.slug === cat) ?? null;
    const filtered = activeCat ? courses.filter((c) => itemInCategory(c, activeCat)) : courses;

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">Courses</h1>
                <p className="text-light-subtle dark:text-dark-subtle">
                    Learn at your own pace with recorded lessons, or join structured live courses.
                </p>
            </header>

            <CategoryFilterBar categories={categories} active={cat} basePath="/courses" />

            {filtered.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((course) => (
                        <CourseCard key={course.id} course={course} settings={settings} />
                    ))}
                </div>
            ) : (
                <p className="card text-light-subtle dark:text-dark-subtle">
                    No courses in this category yet — try another.
                </p>
            )}
        </div>
    );
}
