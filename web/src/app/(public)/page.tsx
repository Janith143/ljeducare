import Link from 'next/link';
import type { Category, Course } from '@ljeducare/shared';
import CategoryCard from '@/components/catalog/CategoryCard';
import TeacherCard from '@/components/catalog/TeacherCard';
import ProductCard from '@/components/catalog/ProductCard';
import HeaderSearch from '@/components/layout/HeaderSearch';
import {
    listPublishedClasses,
    listPublishedCourses,
    listPublishedQuizzes,
    listPublishedTeachers,
} from '@/lib/data/catalog';
import { getHomepageSettings, listCategories, teachersForCategory } from '@/lib/data/categories';
import { getCurrencySettings } from '@/lib/data/currencies';
import { SITE } from '@/lib/site';

export const revalidate = 300;

const inCategory = (item: { categorySlug?: string; category?: string }, cat: Category) =>
    item.categorySlug ? item.categorySlug === cat.slug : item.category === cat.name || item.category === cat.slug;

export default async function HomePage() {
    const [categories, homepage, teachers, courses, quizzes, classes, settings] = await Promise.all([
        listCategories(),
        getHomepageSettings(),
        listPublishedTeachers(),
        listPublishedCourses(),
        listPublishedQuizzes(),
        listPublishedClasses(),
        getCurrencySettings(),
    ]);

    // Featured categories: explicit order/subset from settings, else the `featured` ones, else all.
    const explicit = (homepage.featuredCategorySlugs ?? [])
        .map((s) => categories.find((c) => c.slug === s))
        .filter((c): c is Category => !!c);
    const featuredCats = (explicit.length ? explicit : categories.filter((c) => c.featured)).length
        ? (explicit.length ? explicit : categories.filter((c) => c.featured))
        : categories;

    const catBlocks = await Promise.all(
        featuredCats.slice(0, 4).map(async (cat) => ({
            cat,
            teachers: (await teachersForCategory(cat)).slice(0, 6),
            count:
                courses.filter((c) => inCategory(c, cat)).length +
                quizzes.filter((q) => inCategory(q, cat)).length +
                classes.filter((c) => inCategory(c, cat)).length,
        })),
    );

    const popularIds = homepage.featuredTeacherIds ?? [];
    const popularTeachers = (
        popularIds.length
            ? popularIds.map((id) => teachers.find((t) => t.id === id)).filter(Boolean)
            : teachers
    ).slice(0, 8) as typeof teachers;

    const featuredCourses = courses.slice(0, 4);
    const heroTitle = homepage.heroTitle || `Learn with ${SITE.name}`;
    const heroSubtitle =
        homepage.heroSubtitle || 'Courses, live classes, quizzes and exams across every subject — all in one place.';

    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-light-border bg-gradient-to-br from-primary/15 via-primary/5 to-transparent dark:border-dark-border">
                <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:py-20">
                    <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">{heroTitle}</h1>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-light-subtle dark:text-dark-subtle">{heroSubtitle}</p>
                    <div className="mx-auto mt-8 max-w-xl">
                        <HeaderSearch large />
                    </div>
                </div>
            </section>

            {/* Categories */}
            {categories.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 py-12">
                    <SectionHeading title="Browse by category" href="/categories" linkLabel="All categories" />
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {categories.slice(0, 8).map((cat) => (
                            <CategoryCard
                                key={cat.id}
                                category={cat}
                                count={
                                    courses.filter((c) => inCategory(c, cat)).length +
                                    quizzes.filter((q) => inCategory(q, cat)).length +
                                    classes.filter((c) => inCategory(c, cat)).length
                                }
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Teachers under each featured category */}
            {catBlocks
                .filter((b) => b.teachers.length > 0)
                .map((block) => (
                    <section key={block.cat.id} className="mx-auto max-w-7xl px-4 py-8">
                        <SectionHeading
                            title={block.cat.name}
                            subtitle={`${block.count} ${block.count === 1 ? 'item' : 'items'}`}
                            href={`/categories/${block.cat.slug}`}
                            linkLabel="Explore"
                        />
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                            {block.teachers.map((t) => (
                                <TeacherCard key={t.id} teacher={t} />
                            ))}
                        </div>
                    </section>
                ))}

            {/* Popular teachers */}
            {popularTeachers.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 py-8">
                    <SectionHeading title="Popular teachers" href="/teachers" linkLabel="All teachers" />
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
                        {popularTeachers.map((t) => (
                            <TeacherCard key={t.id} teacher={t} />
                        ))}
                    </div>
                </section>
            )}

            {/* Featured courses */}
            {featuredCourses.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 py-8 pb-16">
                    <SectionHeading title="Featured courses" href="/courses" linkLabel="All courses" />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {featuredCourses.map((c: Course) => (
                            <ProductCard
                                key={c.id}
                                href={`/courses/${c.slug}`}
                                title={c.title}
                                subtitle={c.subject}
                                image={c.coverImage}
                                typeLabel="Course"
                                pricing={c.pricing}
                                settings={settings}
                                cartItem={{ itemType: 'course', itemId: c.id, title: c.title, image: c.coverImage, pricing: c.pricing, teacherName: teachers.find((t) => t.id === c.teacherId)?.name }}
                            />
                        ))}
                    </div>
                </section>
            )}

            {categories.length === 0 && (
                <section className="mx-auto max-w-3xl px-4 py-16 text-center">
                    <h2 className="text-xl font-bold">Welcome to {SITE.name}</h2>
                    <p className="mt-2 text-light-subtle dark:text-dark-subtle">
                        Browse our{' '}
                        <Link href="/courses" className="text-primary hover:underline">courses</Link>,{' '}
                        <Link href="/classes" className="text-primary hover:underline">classes</Link> and{' '}
                        <Link href="/quizzes" className="text-primary hover:underline">quizzes</Link>.
                    </p>
                </section>
            )}
        </>
    );
}

function SectionHeading({ title, subtitle, href, linkLabel }: { title: string; subtitle?: string; href: string; linkLabel: string }) {
    return (
        <div className="mb-5 flex items-end justify-between gap-3">
            <div>
                <h2 className="text-2xl font-bold">{title}</h2>
                {subtitle && <p className="text-sm text-light-subtle dark:text-dark-subtle">{subtitle}</p>}
            </div>
            <Link href={href} className="shrink-0 text-sm font-medium text-primary hover:underline">
                {linkLabel} →
            </Link>
        </div>
    );
}
