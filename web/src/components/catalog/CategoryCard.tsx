import Link from 'next/link';
import type { Category } from '@ljeducare/shared';

/** Image tile for a browse category → /categories/[slug]. */
export default function CategoryCard({ category, count }: { category: Category; count?: number }) {
    return (
        <Link
            href={`/categories/${category.slug}`}
            className="group relative block overflow-hidden rounded-2xl border border-light-border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-dark-border"
        >
            <div className="aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary/25 to-primary/5">
                {category.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={category.image}
                        alt={category.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-black text-primary/40">
                        {category.name.slice(0, 1).toUpperCase()}
                    </div>
                )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="text-lg font-bold text-white drop-shadow-sm">{category.name}</h3>
                {category.description && (
                    <p className="line-clamp-1 text-xs text-white/80">{category.description}</p>
                )}
                {typeof count === 'number' && (
                    <p className="mt-1 text-[11px] font-medium text-white/70">
                        {count} {count === 1 ? 'item' : 'items'}
                    </p>
                )}
            </div>
        </Link>
    );
}
