import Link from 'next/link';
import { SITE } from '@/lib/site';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-light-background px-4 dark:bg-dark-background">
            <Link href="/" className="mb-8 flex items-center gap-2 text-2xl font-bold text-primary">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-extrabold text-white">
                    LJ
                </span>
                {SITE.name}
            </Link>
            <div className="card w-full max-w-md p-6">{children}</div>
            <p className="mt-6 text-sm text-light-subtle dark:text-dark-subtle">
                <Link href="/" className="hover:text-primary">
                    ← Back to home
                </Link>
            </p>
        </div>
    );
}
