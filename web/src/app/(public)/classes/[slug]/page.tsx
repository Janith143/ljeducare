import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PriceTag from '@/components/catalog/PriceTag';
import { getClassBySlug, listPublishedClasses } from '@/lib/data/catalog';
import { getCurrencySettings } from '@/lib/data/currencies';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
    const classes = await listPublishedClasses();
    return classes.slice(0, 50).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const cls = await getClassBySlug((await params).slug);
    if (!cls) return { title: 'Class not found' };
    return { title: cls.title, description: cls.description.slice(0, 160) };
}

export default async function ClassDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const [{ slug }, settings] = await Promise.all([params, getCurrencySettings()]);
    const cls = await getClassBySlug(slug);
    if (!cls) notFound();

    const schedule =
        cls.recurrence === 'weekly'
            ? `Weekly · ${cls.startTime}–${cls.endTime}`
            : `${cls.date} · ${cls.startTime}–${cls.endTime}`;

    return (
        <article className="mx-auto max-w-4xl space-y-6 px-4 py-10">
            <nav className="text-sm text-light-subtle dark:text-dark-subtle" aria-label="Breadcrumb">
                <Link href="/classes" className="hover:text-primary">Classes</Link>
                {' / '}
                <span>{cls.title}</span>
            </nav>

            <header className="space-y-3">
                <h1 className="text-3xl font-bold">{cls.title}</h1>
                <p className="text-light-subtle dark:text-dark-subtle">
                    {cls.subject} · {cls.targetAudience}
                    {cls.medium ? ` · ${cls.medium} medium` : ''} · {cls.mode}
                </p>
                <p className="font-medium">{schedule}</p>
            </header>

            <section className="card whitespace-pre-line">{cls.description}</section>

            <section className="card flex flex-wrap items-center justify-between gap-4">
                <div>
                    {cls.hidePrice ? (
                        <p className="text-light-subtle dark:text-dark-subtle">Contact the institute for pricing.</p>
                    ) : (
                        <PriceTag pricing={cls.pricing} settings={settings} className="text-2xl" />
                    )}
                    {cls.recurrence === 'weekly' && cls.weeklyPaymentOption && (
                        <p className="text-sm text-light-subtle dark:text-dark-subtle">
                            Billed {cls.weeklyPaymentOption === 'per_month' ? 'monthly' : 'per session'}
                        </p>
                    )}
                </div>
                <Link href={`/checkout/class/${cls.id}`} className="btn-primary px-8 py-3">
                    Enroll Now
                </Link>
            </section>
        </article>
    );
}
