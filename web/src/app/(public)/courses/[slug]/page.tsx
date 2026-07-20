import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PriceTag from '@/components/catalog/PriceTag';
import TeacherByline from '@/components/catalog/TeacherByline';
import AddToCartButton from '@/components/cart/AddToCartButton';
import { getCourseBySlug, getTeacherPublicById, listPublishedCourses } from '@/lib/data/catalog';
import { getCurrencySettings } from '@/lib/data/currencies';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
    const courses = await listPublishedCourses();
    return courses.slice(0, 50).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const course = await getCourseBySlug((await params).slug);
    if (!course) return { title: 'Course not found' };
    return { title: course.title, description: course.description.slice(0, 160) };
}

export default async function CourseDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const [{ slug }, settings] = await Promise.all([params, getCurrencySettings()]);
    const course = await getCourseBySlug(slug);
    if (!course) notFound();

    const teacher = await getTeacherPublicById(course.teacherId);
    const freePreviews = course.lectures.filter((l) => l.isFreePreview).length;

    return (
        <article className="mx-auto max-w-4xl space-y-6 px-4 py-10">
            <nav className="text-sm text-light-subtle dark:text-dark-subtle" aria-label="Breadcrumb">
                <Link href="/courses" className="hover:text-primary">Courses</Link>
                {' / '}
                <span>{course.title}</span>
            </nav>

            <header className="space-y-3">
                <h1 className="text-3xl font-bold">{course.title}</h1>
                <p className="text-light-subtle dark:text-dark-subtle">
                    {course.subject}
                    {course.grade ? ` · ${course.grade}` : ''} ·{' '}
                    {course.type === 'recorded' ? 'Recorded course' : 'Live course'}
                </p>
            </header>

            {teacher && (
                <section className="card">
                    <TeacherByline teacher={teacher} />
                </section>
            )}

            <section className="card whitespace-pre-line">{course.description}</section>

            {course.lectures.length > 0 && (
                <section className="space-y-2">
                    <h2 className="text-xl font-semibold">
                        Curriculum · {course.lectures.length} lessons
                        {freePreviews ? ` (${freePreviews} free preview${freePreviews > 1 ? 's' : ''})` : ''}
                    </h2>
                    <ol className="card divide-y divide-light-border p-0 dark:divide-dark-border">
                        {course.lectures.map((lecture, i) => (
                            <li key={lecture.id} className="flex items-center justify-between gap-3 p-3">
                                <span className="flex items-center gap-3">
                                    <span className="text-sm text-light-subtle dark:text-dark-subtle">{i + 1}.</span>
                                    <span className="font-medium">{lecture.title}</span>
                                    {lecture.isFreePreview && (
                                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                                            Free preview
                                        </span>
                                    )}
                                </span>
                                <span className="text-sm text-light-subtle dark:text-dark-subtle">
                                    {lecture.durationMinutes} min
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            <section className="card flex flex-wrap items-center justify-between gap-4">
                <PriceTag pricing={course.pricing} settings={settings} className="text-2xl" />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <AddToCartButton
                        subtle
                        item={{ itemType: 'course', itemId: course.id, title: course.title, image: course.coverImage, pricing: course.pricing }}
                    />
                    <Link href={`/checkout/course/${course.id}`} className="btn-primary px-8 py-3">
                        Enroll Now
                    </Link>
                </div>
            </section>
        </article>
    );
}
