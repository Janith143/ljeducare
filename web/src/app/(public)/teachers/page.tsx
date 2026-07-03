import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublishedTeachers } from '@/lib/data/catalog';

export const revalidate = 300;

export const metadata: Metadata = {
    title: 'Our Teachers',
    description: 'Meet the teachers of our institute.',
};

export default async function TeachersPage() {
    const teachers = await listPublishedTeachers();

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">Our Teachers</h1>
                <p className="text-light-subtle dark:text-dark-subtle">
                    Experienced educators guiding every class, course and exam.
                </p>
            </header>

            {teachers.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {teachers.map((t) => (
                        <Link key={t.id} href={`/teachers/${t.slug}`} className="card group flex items-center gap-4 transition-shadow hover:shadow-md">
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                                {t.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                            </span>
                            <span>
                                <span className="block font-semibold group-hover:text-primary">{t.name}</span>
                                <span className="block text-sm text-light-subtle dark:text-dark-subtle">
                                    {t.subjects.join(', ') || t.tagline}
                                </span>
                            </span>
                        </Link>
                    ))}
                </div>
            ) : (
                <p className="card text-light-subtle dark:text-dark-subtle">Teacher profiles coming soon.</p>
            )}
        </div>
    );
}
