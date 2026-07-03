import Link from 'next/link';
import { requireRole } from '@/lib/auth/session';

export default async function StudentOverviewPage() {
    const user = await requireRole('student');
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}!</h1>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link href="/classes" className="card transition-shadow hover:shadow-md">
                    <h2 className="font-semibold text-primary">Browse Classes</h2>
                    <p className="mt-1 text-sm text-light-subtle dark:text-dark-subtle">
                        Find and enroll in live classes.
                    </p>
                </Link>
                <Link href="/student/classes" className="card transition-shadow hover:shadow-md">
                    <h2 className="font-semibold text-primary">My Classes</h2>
                    <p className="mt-1 text-sm text-light-subtle dark:text-dark-subtle">
                        Join sessions and watch recordings.
                    </p>
                </Link>
                <Link href="/student/results" className="card transition-shadow hover:shadow-md">
                    <h2 className="font-semibold text-primary">Score Card</h2>
                    <p className="mt-1 text-sm text-light-subtle dark:text-dark-subtle">
                        Your quiz and exam performance.
                    </p>
                </Link>
            </div>
        </div>
    );
}
