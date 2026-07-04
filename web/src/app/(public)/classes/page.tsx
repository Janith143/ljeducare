import type { Metadata } from 'next';
import ClassCard from '@/components/catalog/ClassCard';
import CategoryFilterBar from '@/components/catalog/CategoryFilterBar';
import { listPublishedClasses } from '@/lib/data/catalog';
import { getCurrencySettings } from '@/lib/data/currencies';
import { itemInCategory, listCategories } from '@/lib/data/categories';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Live Classes',
    description: 'Browse and enroll in our live online and physical classes.',
};

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
    const { cat } = await searchParams;
    const [classes, settings, categories] = await Promise.all([
        listPublishedClasses(),
        getCurrencySettings(),
        listCategories(),
    ]);
    const activeCat = categories.find((c) => c.slug === cat) ?? null;
    const filtered = activeCat ? classes.filter((c) => itemInCategory(c, activeCat)) : classes;

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">Live Classes</h1>
                <p className="text-light-subtle dark:text-dark-subtle">
                    Join weekly and one-off classes — online, at the institute, or both.
                </p>
            </header>

            <CategoryFilterBar categories={categories} active={cat} basePath="/classes" />

            {filtered.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((cls) => (
                        <ClassCard key={cls.id} cls={cls} settings={settings} />
                    ))}
                </div>
            ) : (
                <p className="card text-light-subtle dark:text-dark-subtle">
                    No classes in this category yet — try another.
                </p>
            )}
        </div>
    );
}
