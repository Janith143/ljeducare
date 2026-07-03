import { notFound } from 'next/navigation';
import type { Pricing } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import CheckoutClient from '@/components/checkout/CheckoutClient';
import { requireRole } from '@/lib/auth/session';
import { getCurrencySettings } from '@/lib/data/currencies';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

const ITEM_COLLECTIONS: Record<string, string> = {
    class: COLLECTIONS.CLASSES,
    course: COLLECTIONS.COURSES,
    quiz: COLLECTIONS.QUIZZES,
};

export default async function CheckoutPage({
    params,
}: {
    params: Promise<{ itemType: string; itemId: string }>;
}) {
    await requireRole('student');
    const { itemType, itemId } = await params;
    const collection = ITEM_COLLECTIONS[itemType];
    if (!collection) notFound();

    const [doc, settings] = await Promise.all([
        adminDb().collection(collection).doc(itemId).get(),
        getCurrencySettings(),
    ]);
    if (!doc.exists) notFound();
    const item = doc.data()!;
    if (item.isDeleted || item.isPublished !== true) notFound();

    const pricing: Pricing =
        itemType === 'class' && item.freeUntil && Date.parse(item.freeUntil) > Date.now()
            ? { basePrice: 0, isFree: true }
            : (item.pricing ?? { basePrice: 0, isFree: true });

    return (
        <div className="mx-auto max-w-2xl px-4 py-10">
            <h1 className="mb-2 text-2xl font-bold">Checkout</h1>
            <p className="mb-6 text-light-subtle dark:text-dark-subtle">
                {item.title} <span className="text-xs">({itemType})</span>
            </p>
            <CheckoutClient
                itemType={itemType}
                itemId={itemId}
                itemTitle={item.title}
                pricing={pricing}
                settings={settings}
            />
        </div>
    );
}
