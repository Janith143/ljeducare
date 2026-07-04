import Link from 'next/link';
import type { Category } from '@ljeducare/shared';

/** Subject/category filter chips for the catalog pages. Filters via ?cat=<slug>. */
export default function CategoryFilterBar({
    categories,
    active,
    basePath,
}: {
    categories: Category[];
    active?: string;
    basePath: string;
}) {
    if (categories.length === 0) return null;
    return (
        <nav className="flex flex-wrap gap-2" aria-label="Filter by category">
            <Chip href={basePath} label="All" active={!active} />
            {categories.map((c) => (
                <Chip key={c.slug} href={`${basePath}?cat=${c.slug}`} label={c.name} active={active === c.slug} />
            ))}
        </nav>
    );
}

function Chip({ href, label, active }: { href: string; label: string; active: boolean }) {
    return (
        <Link
            href={href}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                active
                    ? 'border-primary bg-primary text-white'
                    : 'border-light-border text-light-subtle hover:border-primary hover:text-primary dark:border-dark-border dark:text-dark-subtle'
            }`}
        >
            {label}
        </Link>
    );
}
