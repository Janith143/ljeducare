import Link from 'next/link';
import type { CurrencySettings, Pricing } from '@ljeducare/shared';
import AddToCartButton from '@/components/cart/AddToCartButton';
import type { CartItem } from '@/providers/CartProvider';
import PriceTag from './PriceTag';

const TYPE_BADGE: Record<string, string> = {
    Course: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    Quiz: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    Class: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

export interface ProductCardProps {
    href: string;
    title: string;
    subtitle?: string;
    image?: string;
    typeLabel: 'Course' | 'Quiz' | 'Class';
    pricing: Pricing;
    settings: CurrencySettings;
    /** When set (courses/quizzes), the footer shows an Add-to-cart toggle. */
    cartItem?: CartItem;
    /** Explicit footer control; overrides cartItem. Falls back to a "View" link. */
    action?: React.ReactNode;
}

/**
 * Unified storefront card for a course / quiz / class. The image + title link to the
 * detail page; the footer holds price + an optional action (kept outside the Link so
 * an interactive Add-to-cart button can live there).
 */
export default function ProductCard({ href, title, subtitle, image, typeLabel, pricing, settings, cartItem, action }: ProductCardProps) {
    return (
        <div className="card flex flex-col gap-2 p-0 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
            <Link href={href} className="group flex flex-1 flex-col">
                <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                    {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl font-black text-primary/30">
                            {typeLabel === 'Quiz' ? '❓' : typeLabel === 'Class' ? '🎥' : '📚'}
                        </div>
                    )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                    <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_BADGE[typeLabel]}`}>
                        {typeLabel}
                    </span>
                    <h3 className="line-clamp-2 font-semibold group-hover:text-primary">{title}</h3>
                    {subtitle && <p className="line-clamp-1 text-sm text-light-subtle dark:text-dark-subtle">{subtitle}</p>}
                </div>
            </Link>
            <div className="flex items-center justify-between gap-2 border-t border-light-border px-4 py-3 dark:border-dark-border">
                <PriceTag pricing={pricing} settings={settings} />
                {action ?? (cartItem ? (
                    <AddToCartButton item={cartItem} />
                ) : (
                    <Link href={href} className="text-sm font-medium text-primary hover:underline">
                        View →
                    </Link>
                ))}
            </div>
        </div>
    );
}
