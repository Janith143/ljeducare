import Link from 'next/link';
import { SITE } from '@/lib/site';

const FOOTER_GROUPS = [
    {
        title: 'Learn',
        links: [
            { href: '/classes', label: 'Live Classes' },
            { href: '/courses', label: 'Recorded Courses' },
            { href: '/quizzes', label: 'Quizzes' },
            { href: '/exams', label: 'Exams' },
        ],
    },
    {
        title: 'Institute',
        links: [
            { href: '/teachers', label: 'Our Teachers' },
            { href: '/verify', label: 'Verify a Certificate' },
            { href: '/register', label: 'Become a Student' },
        ],
    },
    {
        title: 'Legal',
        links: [
            { href: '/privacy', label: 'Privacy Policy' },
            { href: '/terms', label: 'Terms of Service' },
            { href: '/refund-policy', label: 'Refund Policy' },
        ],
    },
];

/** Public site footer — server component with crawlable links. */
export default function Footer() {
    return (
        <footer className="border-t border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <p className="text-lg font-bold text-primary">{SITE.name}</p>
                    <p className="mt-2 text-sm text-light-subtle dark:text-dark-subtle">
                        {SITE.description}
                    </p>
                </div>
                {FOOTER_GROUPS.map((group) => (
                    <nav key={group.title} aria-label={group.title}>
                        <p className="font-semibold">{group.title}</p>
                        <ul className="mt-3 space-y-2">
                            {group.links.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-light-subtle transition-colors hover:text-primary dark:text-dark-subtle"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                ))}
            </div>
            <div className="border-t border-light-border py-4 text-center text-xs text-light-subtle dark:border-dark-border dark:text-dark-subtle">
                © {new Date().getFullYear()} {SITE.name}. All rights reserved.
            </div>
        </footer>
    );
}
