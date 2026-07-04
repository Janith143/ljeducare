import Link from 'next/link';
import ProductCard from '@/components/catalog/ProductCard';
import TeacherCard from '@/components/catalog/TeacherCard';
import {
    listPublishedClasses,
    listPublishedCourses,
    listPublishedQuizzes,
    listPublishedTeachers,
} from '@/lib/data/catalog';
import { getCurrencySettings } from '@/lib/data/currencies';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const { q = '' } = await searchParams;
    const term = q.trim().toLowerCase();

    const [courses, classes, quizzes, teachers, settings] = await Promise.all([
        listPublishedCourses(),
        listPublishedClasses(),
        listPublishedQuizzes(),
        listPublishedTeachers(),
        getCurrencySettings(),
    ]);

    const hit = (...vals: (string | undefined)[]) => !!term && vals.some((v) => (v ?? '').toLowerCase().includes(term));
    const mCourses = courses.filter((c) => hit(c.title, c.subject, c.category));
    const mClasses = classes.filter((c) => hit(c.title, c.subject, c.category, c.targetAudience));
    const mQuizzes = quizzes.filter((c) => hit(c.title, c.subject, c.category));
    const mTeachers = teachers.filter((t) => hit(t.name, t.tagline, ...(t.subjects ?? [])));
    const total = mCourses.length + mClasses.length + mQuizzes.length + mTeachers.length;

    return (
        <div className="mx-auto max-w-7xl px-4 py-10">
            <h1 className="text-2xl font-bold">
                {term ? <>Results for “{q}”</> : 'Search'}
            </h1>
            <p className="mt-1 text-sm text-light-subtle dark:text-dark-subtle">
                {term ? `${total} ${total === 1 ? 'match' : 'matches'}` : 'Type in the search box to find courses, classes, quizzes and teachers.'}
            </p>

            {term && total === 0 && (
                <p className="card mt-6 text-sm text-light-subtle dark:text-dark-subtle">
                    Nothing matched — try a different term or{' '}
                    <Link href="/categories" className="text-primary hover:underline">browse categories</Link>.
                </p>
            )}

            {mTeachers.length > 0 && (
                <section className="mt-8">
                    <h2 className="mb-4 text-lg font-semibold">Teachers</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        {mTeachers.map((t) => <TeacherCard key={t.id} teacher={t} />)}
                    </div>
                </section>
            )}

            {mCourses.length > 0 && (
                <ResultRow title="Courses">
                    {mCourses.map((c) => (
                        <ProductCard key={c.id} href={`/courses/${c.slug}`} title={c.title} subtitle={c.subject} image={c.coverImage} typeLabel="Course" pricing={c.pricing} settings={settings} cartItem={{ itemType: 'course', itemId: c.id, title: c.title, image: c.coverImage, pricing: c.pricing }} />
                    ))}
                </ResultRow>
            )}
            {mClasses.length > 0 && (
                <ResultRow title="Classes">
                    {mClasses.map((c) => (
                        <ProductCard key={c.id} href={`/classes/${c.slug}`} title={c.title} subtitle={`${c.subject} · ${c.targetAudience}`} typeLabel="Class" pricing={c.pricing} settings={settings} />
                    ))}
                </ResultRow>
            )}
            {mQuizzes.length > 0 && (
                <ResultRow title="Quizzes">
                    {mQuizzes.map((c) => (
                        <ProductCard key={c.id} href={`/quizzes/${c.slug}`} title={c.title} subtitle={c.subject} typeLabel="Quiz" pricing={c.pricing} settings={settings} cartItem={{ itemType: 'quiz', itemId: c.id, title: c.title, pricing: c.pricing }} />
                    ))}
                </ResultRow>
            )}
        </div>
    );
}

function ResultRow({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold">{title}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
        </section>
    );
}
