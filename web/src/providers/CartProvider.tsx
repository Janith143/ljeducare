'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Pricing } from '@ljeducare/shared';

/** A cartable product — courses + quizzes only (one-time purchases). */
export interface CartItem {
    itemType: 'course' | 'quiz';
    itemId: string;
    title: string;
    teacherName?: string;
    image?: string;
    pricing: Pricing;
}

interface CartContextValue {
    items: CartItem[];
    count: number;
    inCart: (itemType: string, itemId: string) => boolean;
    add: (item: CartItem) => void;
    remove: (itemType: string, itemId: string) => void;
    clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'lje_cart_v1';
const key = (t: string, id: string) => `${t}:${id}`;

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setItems(JSON.parse(raw));
        } catch { /* ignore */ }
        setReady(true);
    }, []);

    useEffect(() => {
        if (!ready) return;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* quota */ }
    }, [items, ready]);

    const add = useCallback((item: CartItem) => {
        setItems((cur) => (cur.some((i) => key(i.itemType, i.itemId) === key(item.itemType, item.itemId)) ? cur : [...cur, item]));
    }, []);
    const remove = useCallback((itemType: string, itemId: string) => {
        setItems((cur) => cur.filter((i) => key(i.itemType, i.itemId) !== key(itemType, itemId)));
    }, []);
    const clear = useCallback(() => setItems([]), []);
    const inCart = useCallback(
        (itemType: string, itemId: string) => items.some((i) => key(i.itemType, i.itemId) === key(itemType, itemId)),
        [items],
    );

    const value = useMemo<CartContextValue>(
        () => ({ items, count: items.length, inCart, add, remove, clear }),
        [items, inCart, add, remove, clear],
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within a CartProvider');
    return ctx;
}
