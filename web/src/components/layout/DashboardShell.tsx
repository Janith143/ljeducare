import Link from 'next/link';
import { SITE } from '@/lib/site';
import SignOutButton from '@/components/layout/SignOutButton';
import NotificationBell from '@/components/layout/NotificationBell';
import SessionGuard from '@/components/layout/SessionGuard';

export interface NavItem {
    href: string;
    label: string;
}

/**
 * Server-rendered dashboard chrome: brand header, sidebar of REAL links,
 * sign-out. Pages render inside as server or client components.
 */
export default function DashboardShell({
    title,
    nav,
    userName,
    roleLabel,
    uid,
    children,
}: {
    title: string;
    nav: NavItem[];
    userName: string;
    roleLabel: string;
    uid?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col">
            {uid && <SessionGuard uid={uid} />}
            <header className="sticky top-0 z-40 border-b border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface">
                <div className="flex h-14 items-center justify-between gap-4 px-4">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2 font-bold text-primary">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-white">
                                LJ
                            </span>
                            <span className="hidden sm:inline">{SITE.name}</span>
                        </Link>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {title}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <span className="hidden text-light-subtle dark:text-dark-subtle sm:inline">
                            {userName} · {roleLabel}
                        </span>
                        {uid && <NotificationBell uid={uid} />}
                        <SignOutButton />
                    </div>
                </div>
            </header>
            <div className="flex flex-1">
                <aside className="hidden w-56 shrink-0 border-r border-light-border bg-light-surface p-3 dark:border-dark-border dark:bg-dark-surface md:block">
                    <nav className="space-y-1" aria-label={`${title} navigation`}>
                        {nav.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="block rounded-lg px-3 py-2 text-sm font-medium text-light-subtle transition-colors hover:bg-primary/10 hover:text-primary dark:text-dark-subtle"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1 p-4 md:p-6">{children}</main>
            </div>
        </div>
    );
}
