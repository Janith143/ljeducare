import type { Metadata } from 'next';
import ClassCard from '@/components/catalog/ClassCard';
import { listPublishedClasses } from '@/lib/data/catalog';
import { getCurrencySettings } from '@/lib/data/currencies';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Live Classes',
    description: 'Browse and enroll in our live online and physical classes.',
};

export default async function ClassesPage({
    searchParams,
}: {
    searchParams: Promise<{ subject?: string }>;
}) {
    const { subject } = await searchParams;
    const [classes, settings] = await Promise.all([listPublishedClasses(), getCurrencySettings()]);

    const subjects = [...new Set(classes.map((c) => c.subject))].sort();
    const filtered = subject ? classes.filter((c) => c.subject === subject) : classes;

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">Live Classes</h1>
                <p className="text-light-subtle dark:text-dark-subtle">
                    Join weekly and one-off classes — online, at the institute, or both.
                </p>
            </header>

            {subjects.length > 1 && (
                <nav className="flex flex-wrap gap-2" aria-label="Filter by subject">
                    <FilterChip href="/classes" label="All" active={!subject} />
                    {subjects.map((s) => (
                        <FilterChip
                            key={s}
                            href={`/classes?subject=${encodeURIComponent(s)}`}
                            label={s}
                            active={subject === s}
                        />
                    ))}
                </nav>
            )}

            {filtered.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((cls) => (
                        <ClassCard key={cls.id} cls={cls} settings={settings} />
                    ))}
                </div>
            ) : (
                <p className="card text-light-subtle dark:text-dark-subtle">
                    No scheduled classes right now — check back soon.
                </p>
            )}
        </div>
    );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
    return (
        <a
            href={href}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                active
                    ? 'border-primary bg-primary text-white'
                    : 'border-light-border text-light-subtle hover:border-primary hover:text-primary dark:border-dark-border dark:text-dark-subtle'
            }`}
        >
            {label}
        </a>
    );
}
