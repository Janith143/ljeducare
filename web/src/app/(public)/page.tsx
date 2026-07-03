import Link from 'next/link';
import ClassCard from '@/components/catalog/ClassCard';
import { listPublishedClasses } from '@/lib/data/catalog';
import { getCurrencySettings } from '@/lib/data/currencies';
import { SITE } from '@/lib/site';

export const revalidate = 300;

const FEATURES = [
    {
        href: '/classes',
        title: 'Live Classes',
        description: 'Join online or physical classes with Zoom and Google Meet, plus session recordings.',
    },
    {
        href: '/courses',
        title: 'Recorded Courses',
        description: 'Learn at your own pace with structured lesson videos and resources.',
    },
    {
        href: '/quizzes',
        title: 'Online Quizzes',
        description: 'Practice with timed quizzes and see your results instantly.',
    },
    {
        href: '/exams',
        title: 'Exams & Score Cards',
        description: 'Track your exam results and progress across every subject.',
    },
];

export default async function HomePage() {
    const [classes, settings] = await Promise.all([listPublishedClasses(), getCurrencySettings()]);
    const upcoming = classes.slice(0, 3);
    return (
        <>
            <section className="bg-gradient-to-b from-primary/10 to-transparent">
                <div className="mx-auto max-w-7xl px-4 py-20 text-center">
                    <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
                        Welcome to <span className="text-primary">{SITE.name}</span>
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-light-subtle dark:text-dark-subtle">
                        Your institute&apos;s own learning platform — live classes, recorded courses,
                        quizzes, exams and attendance, all in one place. Pay securely in your own
                        currency from anywhere in the world.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <Link href="/classes" className="btn-primary px-6 py-3">
                            Browse Classes
                        </Link>
                        <Link href="/register" className="btn-secondary px-6 py-3">
                            Register as a Student
                        </Link>
                    </div>
                </div>
            </section>

            {upcoming.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 py-12">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Upcoming classes</h2>
                        <Link href="/classes" className="text-sm font-medium text-primary hover:underline">
                            See all classes →
                        </Link>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {upcoming.map((cls) => (
                            <ClassCard key={cls.id} cls={cls} settings={settings} />
                        ))}
                    </div>
                </section>
            )}

            <section className="mx-auto max-w-7xl px-4 py-16">
                <h2 className="text-center text-2xl font-bold">Everything you need to learn</h2>
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {FEATURES.map((feature) => (
                        <Link key={feature.href} href={feature.href} className="card group transition-shadow hover:shadow-md">
                            <h3 className="font-semibold text-primary group-hover:underline">{feature.title}</h3>
                            <p className="mt-2 text-sm text-light-subtle dark:text-dark-subtle">
                                {feature.description}
                            </p>
                        </Link>
                    ))}
                </div>
            </section>
        </>
    );
}
