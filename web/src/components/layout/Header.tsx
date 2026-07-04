import Link from 'next/link';
import HeaderSearch from './HeaderSearch';
import CartIcon from '@/components/cart/CartIcon';
import { SITE } from '@/lib/site';

const NAV_LINKS = [
    { href: '/categories', label: 'Categories' },
    { href: '/courses', label: 'Courses' },
    { href: '/classes', label: 'Classes' },
    { href: '/quizzes', label: 'Quizzes' },
    { href: '/teachers', label: 'Teachers' },
];

/** Public site header — server component, real links everywhere. */
export default function Header() {
    return (
        <header className="sticky top-0 z-40 border-b border-light-border bg-light-surface/90 backdrop-blur dark:border-dark-border dark:bg-dark-surface/90">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
                <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-white">
                        LJ
                    </span>
                    {SITE.name}
                </Link>

                <nav className="hidden items-center gap-5 lg:flex" aria-label="Main">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm font-medium text-light-subtle transition-colors hover:text-primary dark:text-dark-subtle"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="mx-2 hidden max-w-xs flex-1 md:block">
                    <HeaderSearch />
                </div>

                <div className="flex items-center gap-2">
                    <CartIcon />
                    <Link href="/login" className="btn-secondary text-sm">
                        Log in
                    </Link>
                    <Link href="/register" className="hidden btn-primary text-sm sm:inline-flex">
                        Register
                    </Link>
                </div>
            </div>
        </header>
    );
}
