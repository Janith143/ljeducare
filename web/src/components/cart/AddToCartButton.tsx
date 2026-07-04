'use client';

import { useCart, type CartItem } from '@/providers/CartProvider';

/** Toggle a course/quiz in the cart. Renders in a ProductCard footer or a detail page. */
export default function AddToCartButton({ item, className = '' }: { item: CartItem; className?: string }) {
    const { inCart, add, remove } = useCart();
    const added = inCart(item.itemType, item.itemId);

    return (
        <button
            type="button"
            onClick={() => (added ? remove(item.itemType, item.itemId) : add(item))}
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
