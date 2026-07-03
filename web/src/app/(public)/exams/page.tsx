import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 300;

export const metadata: Metadata = {
    title: 'Exams & Score Cards',
    description: 'Exam results and student score cards at our institute.',
};

export default function ExamsPage() {
    return (
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">Exams &amp; Score Cards</h1>
                <p className="text-light-subtle dark:text-dark-subtle">
                    Teachers publish exam results for their classes — model papers, term tests and more.
                    Students can view their marks and progress on their personal score card.
                </p>
            </header>
            <div className="card flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Already a student? Your results are on your score card.
                </p>
                <Link href="/student/results" className="btn-primary">
                    View My Score Card
                </Link>
            </div>
        </div>
    );
}
