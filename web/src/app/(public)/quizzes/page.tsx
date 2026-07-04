import type { Metadata } from 'next';
import Link from 'next/link';
import type { CurrencySettings, Quiz } from '@ljeducare/shared';
import PriceTag from '@/components/catalog/PriceTag';
import CategoryFilterBar from '@/components/catalog/CategoryFilterBar';
import { listPublishedQuizzes } from '@/lib/data/catalog';
import { getCurrencySettings } from '@/lib/data/currencies';
import { itemInCategory, listCategories } from '@/lib/data/categories';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Quizzes',
    description: 'Practice with scheduled online quizzes.',
};

export default async function QuizzesPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
    const { cat } = await searchParams;
    const [quizzes, settings, categories] = await Promise.all([
        listPublishedQuizzes(),
        getCurrencySettings(),
        listCategories(),
    ]);
    const activeCat = categories.find((c) => c.slug === cat) ?? null;
    const filtered = activeCat ? quizzes.filter((q) => itemInCategory(q, activeCat)) : quizzes;

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">Online Quizzes</h1>
                <p className="text-light-subtle dark:text-dark-subtle">
                    Timed quizzes with instant results — enroll before the start time.
                </p>
            </header>

            <CategoryFilterBar categories={categories} active={cat} basePath="/quizzes" />

            {filtered.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((quiz) => (
                        <QuizCard key={quiz.id} quiz={quiz} settings={settings} />
                    ))}
                </div>
            ) : (
                <p className="card text-light-subtle dark:text-dark-subtle">
                    No quizzes in this category yet — try another.
                </p>
            )}
        </div>
    );
}

function QuizCard({ quiz, settings }: { quiz: Quiz; settings: CurrencySettings }) {
    return (
        <Link href={`/quizzes/${quiz.slug}`} className="card group flex flex-col gap-2 transition-shadow hover:shadow-md">
            <h3 className="font-semibold group-hover:text-primary">{quiz.title}</h3>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                {quiz.subject}
                {quiz.grade ? ` · ${quiz.grade}` : ''}
            </p>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                {quiz.date} · {quiz.startTime} · {quiz.durationMinutes} min
            </p>
            <div className="mt-auto flex items-center justify-between pt-2">
                <PriceTag pricing={quiz.pricing} settings={settings} />
                <span className="text-sm font-medium text-primary">View quiz →</span>
            </div>
        </Link>
    );
}
