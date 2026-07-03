import type { Metadata } from 'next';
import Link from 'next/link';
import type { CurrencySettings, Quiz } from '@ljeducare/shared';
import PriceTag from '@/components/catalog/PriceTag';
import { listPublishedQuizzes } from '@/lib/data/catalog';
import { getCurrencySettings } from '@/lib/data/currencies';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Quizzes',
    description: 'Practice with scheduled online quizzes.',
};

export default async function QuizzesPage() {
    const [quizzes, settings] = await Promise.all([listPublishedQuizzes(), getCurrencySettings()]);

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">Online Quizzes</h1>
                <p className="text-light-subtle dark:text-dark-subtle">
                    Timed quizzes with instant results — enroll before the start time.
                </p>
            </header>

            {quizzes.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {quizzes.map((quiz) => (
                        <QuizCard key={quiz.id} quiz={quiz} settings={settings} />
                    ))}
                </div>
            ) : (
                <p className="card text-light-subtle dark:text-dark-subtle">
                    No scheduled quizzes right now — check back soon.
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
