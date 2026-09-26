'use server';

import type { Pricing } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { getUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export interface CartQuote {
    /** Live pricing per `${itemType}:${itemId}` — what initiateCartCheckout will charge. */
    pricing: Record<string, Pricing>;
    /** Keys the server would skip: already owned by this student, or no longer on sale. */
    owned: string[];
    unavailable: string[];
}

const COLLECTION = { course: COLLECTIONS.COURSES, quiz: COLLECTIONS.QUIZZES } as const;
const ENROLLED = { course: 'enrolledCourseIds', quiz: 'enrolledQuizIds' } as const;

/**
 * Re-price the cart from Firestore. The cart lives in localStorage with the pricing
 * captured when each item was added, so without this the cart total drifts from what
 * checkout charges. Mirrors functions/sale-handler cart.js + items.js loadItem exactly.
 */
export async function quoteCartAction(keys: { itemType: string; itemId: string }[]): Promise<CartQuote> {
    const items = (Array.isArray(keys) ? keys : [])
        .slice(0, 20)
        .filter((k): k is { itemType: 'course' | 'quiz'; itemId: string } =>
            (k?.itemType === 'course' || k?.itemType === 'quiz') && typeof k.itemId === 'string' && !!k.itemId,
        );
    const quote: CartQuote = { pricing: {}, owned: [], unavailable: [] };
    if (!items.length) return quote;

    const db = adminDb();
    const user = await getUser();
    const [docs, userDoc] = await Promise.all([
        db.getAll(...items.map((k) => db.collection(COLLECTION[k.itemType]).doc(k.itemId))),
        user?.role === 'student' ? db.collection(COLLECTIONS.USERS).doc(user.uid).get() : null,
    ]);
    const student = userDoc?.data() ?? {};

    items.forEach((k, i) => {
        const key = `${k.itemType}:${k.itemId}`;
        const item = docs[i].data();
        if (!item || item.isDeleted || item.isPublished !== true) quote.unavailable.push(key);
        else if ((student[ENROLLED[k.itemType]] ?? []).map(String).includes(k.itemId)) quote.owned.push(key);
        else quote.pricing[key] = item.pricing ?? { basePrice: 0, isFree: true };
    });
    return quote;
}
