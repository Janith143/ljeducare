'use client';

import Link from 'next/link';
import { useCart } from '@/providers/CartProvider';

/** Header cart button with a live item-count badge. */
export default function CartIcon() {
    const { count } = useCart();
    return (
        <Link
            href="/cart"
            aria-label={`Cart${count ? ` (${count})` : ''}`}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-light-subtle transition-colors hover:bg-primary/10 hover:text-primary dark:text-dark-subtle"
        >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                    {count}
                </span>
            )}
        </Link>
    );
}
