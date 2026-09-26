import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ClassCard from '@/components/catalog/ClassCard';
import { getTeacherBySlug, listPublishedClasses } from '@/lib/data/catalog';
import { getCurrencySettings } from '@/lib/data/currencies';

// Dynamic, not ISR: build-time HTML ships in every App Hosting instance and is never
// reliably revalidated, so an edited class price kept showing on this page's cards.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const teacher = await getTeacherBySlug((await params).slug);
    if (!teacher) return { title: 'Teacher not found' };
    return { title: teacher.name, description: teacher.tagline || teacher.bio.slice(0, 160) };
}

export default async function TeacherBioPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const [teacher, allClasses, settings] = await Promise.all([
        getTeacherBySlug(slug),
        listPublishedClasses(),
        getCurrencySettings(),
    ]);
    if (!teacher) notFound();

    const classes = allClasses.filter((c) => c.teacherId === teacher.id);

    return (
        <article className="mx-auto max-w-5xl space-y-8 px-4 py-10">
            <nav className="text-sm text-light-subtle dark:text-dark-subtle" aria-label="Breadcrumb">
                <Link href="/teachers" className="hover:text-primary">Teachers</Link>
                {' / '}
                <span>{teacher.name}</span>
            </nav>

            <header className="flex items-center gap-5">
                <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-bold text-primary">
                    {teacher.profileImage || teacher.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={teacher.profileImage || teacher.avatar} alt={teacher.name} className="h-full w-full object-cover" />
                    ) : (
                        teacher.name.split(' ').map((w) => w[0]).slice(0, 2).join('')
                    )}
                </span>
                <div>
                    <h1 className="text-3xl font-bold">{teacher.name}</h1>
                    {teacher.tagline && (
                        <p className="text-light-subtle dark:text-dark-subtle">{teacher.tagline}</p>
                    )}
                    <p className="mt-1 text-sm text-light-subtle dark:text-dark-subtle">
                        {teacher.subjects.join(' · ')}
                        {teacher.experienceYears ? ` · ${teacher.experienceYears}+ years experience` : ''}
                    </p>
                </div>
            </header>

            {teacher.bio && <section className="card whitespace-pre-line">{teacher.bio}</section>}

            {(teacher.qualifications?.length ?? 0) > 0 && (
                <section className="space-y-2">
                    <h2 className="text-xl font-semibold">Qualifications</h2>
                    <ul className="card list-inside list-disc space-y-1 text-sm">
                        {teacher.qualifications!.map((q) => <li key={q}>{q}</li>)}
                    </ul>
                </section>
            )}

            <section className="space-y-3">
                <h2 className="text-xl font-semibold">Classes by {teacher.name.split(' ')[0]}</h2>
                {classes.length ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {classes.map((cls) => (
                            <ClassCard key={cls.id} cls={cls} settings={settings} />
                        ))}
                    </div>
                ) : (
                    <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                        No scheduled classes right now.
                    </p>
                )}
            </section>
        </article>
    );
}
