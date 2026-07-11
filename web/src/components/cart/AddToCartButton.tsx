'use client';

import { useCart, type CartItem } from '@/providers/CartProvider';

/**
 * Toggle a course/quiz in the cart. `subtle` renders a low-key text button (for card
 * footers / next to a primary "Enroll Now" CTA); default is the filled button. Safe to
 * nest inside a card-wide <Link> — the click is stopped from navigating.
 */
export default function AddToCartButton({
    item,
    className = '',
    subtle = false,
}: {
    item: CartItem;
    className?: string;
    subtle?: boolean;
}) {
    const { inCart, add, remove } = useCart();
    const added = inCart(item.itemType, item.itemId);

    function toggle(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (added) remove(item.itemType, item.itemId);
        else add(item);
    }

    if (subtle) {
        return (
            <button
                type="button"
                onClick={toggle}
                className={`inline-flex items-center gap-1 text-sm font-medium transition-colors hover:underline ${
                    added ? 'text-green-600 dark:text-green-400' : 'text-light-subtle hover:text-primary dark:text-dark-subtle'
                } ${className}`}
            >
                {added ? '✓ In cart' : '+ Add to cart'}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={toggle}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                added
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950 dark:text-green-300'
                    : 'bg-primary text-white hover:bg-primary/90'
            } ${className}`}
        >
            {added ? '✓ In cart' : '+ Add to cart'}
        </button>
    );
}
