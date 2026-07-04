import CartClient from '@/components/cart/CartClient';
import { getCurrencySettings } from '@/lib/data/currencies';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your cart' };

export default async function CartPage() {
    const settings = await getCurrencySettings();
    return (
        <div className="mx-auto max-w-5xl px-4 py-10">
            <h1 className="mb-6 text-2xl font-bold">Your cart</h1>
            <CartClient settings={settings} />
        </div>
    );
}
