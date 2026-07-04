'use client';

import { useEffect } from 'react';
import { useCart } from '@/providers/CartProvider';

/** Empties the cart once an order has been placed (rendered on the order page). */
export default function ClearCartOnMount() {
    const { clear } = useCart();
    useEffect(() => { clear(); }, [clear]);
    return null;
}
