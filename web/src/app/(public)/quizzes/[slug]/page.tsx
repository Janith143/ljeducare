import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PriceTag from '@/components/catalog/PriceTag';
import AddToCartButton from '@/components/cart/AddToCartButton';
import { listPublishedQuizzes } from '@/lib/data/catalog';
import { getCurrencySettings } from '@/lib/data/currencies';

// Dynamic, not ISR: build-time HTML ships in every App Hosting instance and is never
// reliably revalidated, so an edited price kept showing while checkout charged the new one.
export const dynamic = 'force-dynamic';

async function getQuizBySlug(slug: string) {
    const all = await listPublishedQuizzes();
    return all.find((q) => q.slug === slug) ?? null;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const quiz = await getQuizBySlug((await params).slug);
    if (!quiz) return { title: 'Quiz not found' };
    return { title: quiz.title, description: quiz.description.slice(0, 160) };
}

export default async function QuizDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const [{ slug }, settings] = await Promise.all([params, getCurrencySettings()]);
    const quiz = await getQuizBySlug(slug);
    if (!quiz) notFound();

    return (
        <article className="mx-auto max-w-4xl space-y-6 px-4 py-10">
            <nav className="text-sm text-light-subtle dark:text-dark-subtle" aria-label="Breadcrumb">
                <Link href="/quizzes" className="hover:text-primary">Quizzes</Link>
                {' / '}
                <span>{quiz.title}</span>
            </nav>

            <header className="space-y-3">
                <h1 className="text-3xl font-bold">{quiz.title}</h1>
                <p className="text-light-subtle dark:text-dark-subtle">
                    {quiz.subject}
                    {quiz.grade ? ` · ${quiz.grade}` : ''}
                </p>
                <p className="font-medium">
                    {quiz.date} at {quiz.startTime} · {quiz.durationMinutes} minutes
                </p>
            </header>

            <section className="card whitespace-pre-line">{quiz.description}</section>

            <section className="card flex flex-wrap items-center justify-between gap-4">
                <PriceTag pricing={quiz.pricing} settings={settings} className="text-2xl" />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <AddToCartButton subtle item={{ itemType: 'quiz', itemId: quiz.id, title: quiz.title, pricing: quiz.pricing }} />
                    <Link href={`/checkout/quiz/${quiz.id}`} className="btn-primary px-8 py-3">
                        Enroll Now
                    </Link>
                </div>
            </section>
        </article>
    );
}
