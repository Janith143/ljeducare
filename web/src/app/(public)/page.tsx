import Link from 'next/link';
import type { Category } from '@ljeducare/shared';
import TeacherCard from '@/components/catalog/TeacherCard';
import HeaderSearch from '@/components/layout/HeaderSearch';
import {
    listPublishedClasses,
    listPublishedCourses,
    listPublishedQuizzes,
    listPublishedTeachers,
} from '@/lib/data/catalog';
import { getHomepageSettings, listCategories, teachersForCategory } from '@/lib/data/categories';
import { SITE } from '@/lib/site';

export const revalidate = 300;

const inCategory = (item: { categorySlug?: string; category?: string }, cat: Category) =>
    item.categorySlug ? item.categorySlug === cat.slug : item.category === cat.name || item.category === cat.slug;

export default async function HomePage() {
    const [categories, homepage, teachers, courses, quizzes, classes] = await Promise.all([
        listCategories(),
        getHomepageSettings(),
        listPublishedTeachers(),
        listPublishedCourses(),
        listPublishedQuizzes(),
        listPublishedClasses(),
    ]);

    // One section per subject: its teachers (all of them) + its content counts.
    const sections = (
        await Promise.all(
            categories.map(async (cat) => ({
                cat,
                teachers: await teachersForCategory(cat),
                courses: courses.filter((c) => inCategory(c, cat)).length,
                classes: classes.filter((c) => inCategory(c, cat)).length,
                quizzes: quizzes.filter((q) => inCategory(q, cat)).length,
            })),
        )
    ).filter((s) => s.teachers.length > 0 || s.courses + s.classes + s.quizzes > 0);

    const stats = [
        { label: 'Subjects', value: categories.length },
        { label: 'Teachers', value: teachers.length },
        { label: 'Courses', value: courses.length },
        { label: 'Classes', value: classes.length },
    ];

    const title = homepage.heroTitle || SITE.name;
    const subtitle = homepage.heroSubtitle || 'Institute learning portal — browse subjects, teachers and classes.';

    return (
        <>
            {/* Portal header — functional, not a marketing hero */}
            <section className="border-b border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface">
                <div className="mx-auto max-w-7xl px-4 py-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
                            <p className="mt-1 text-light-subtle dark:text-dark-subtle">{subtitle}</p>
                        </div>
                        <div className="w-full md:max-w-sm">
                            <HeaderSearch />
                        </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {stats.map((s) => (
                            <div key={s.label} className="rounded-xl border border-light-border px-4 py-3 dark:border-dark-border">
                                <p className="text-2xl font-bold text-primary">{s.value}</p>
                                <p className="text-xs font-medium text-light-subtle dark:text-dark-subtle">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Subject quick-nav */}
            {sections.length > 0 && (
                <nav aria-label="Subjects" className="sticky top-16 z-30 border-b border-light-border bg-light-surface/90 backdrop-blur dark:border-dark-border dark:bg-dark-surface/90">
                    <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2.5">
                        {sections.map((s) => (
                            <a key={s.cat.id} href={`#cat-${s.cat.slug}`}
                                className="whitespace-nowrap rounded-full border border-light-border px-3 py-1 text-sm font-medium text-light-subtle transition-colors hover:border-primary hover:text-primary dark:border-dark-border dark:text-dark-subtle">
                                {s.cat.name}
                            </a>
                        ))}
                    </div>
                </nav>
            )}

            {/* Subject directory — all teachers, category-wise */}
            <div className="mx-auto max-w-7xl space-y-12 px-4 py-10">
                {sections.length === 0 ? (
                    <div className="card text-center">
                        <p className="text-lg font-semibold">Content is being set up</p>
                        <p className="mt-1 text-sm text-light-subtle dark:text-dark-subtle">
                            Browse the{' '}
                            <Link href="/courses" className="text-primary hover:underline">courses</Link>,{' '}
                            <Link href="/classes" className="text-primary hover:underline">classes</Link> and{' '}
                            <Link href="/quizzes" className="text-primary hover:underline">quizzes</Link> catalog in the meantime.
                        </p>
                    </div>
                ) : (
                    sections.map((section) => (
                        <section key={section.cat.id} id={`cat-${section.cat.slug}`} className="scroll-mt-32">
                            <div className="mb-5 flex items-center gap-4 border-b border-light-border pb-4 dark:border-dark-border">
                                {section.cat.image && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={section.cat.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-xl font-bold">{section.cat.name}</h2>
                                    <p className="text-sm text-light-subtle dark:text-dark-subtle">
                                        {section.teachers.length} {section.teachers.length === 1 ? 'teacher' : 'teachers'}
                                        {section.courses > 0 && ` · ${section.courses} courses`}
                                        {section.classes > 0 && ` · ${section.classes} classes`}
                                        {section.quizzes > 0 && ` · ${section.quizzes} quizzes`}
                                    </p>
                                </div>
                                <Link href={`/categories/${section.cat.slug}`} className="shrink-0 text-sm font-medium text-primary hover:underline">
                                    View all →
                                </Link>
                            </div>

                            {section.teachers.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                                    {section.teachers.map((t) => <TeacherCard key={t.id} teacher={t} />)}
                                </div>
                            ) : (
                                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                                    No teachers listed yet —{' '}
                                    <Link href={`/categories/${section.cat.slug}`} className="text-primary hover:underline">view content in {section.cat.name}</Link>.
                                </p>
                            )}
                        </section>
                    ))
                )}
            </div>
        </>
    );
}
