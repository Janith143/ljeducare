'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CurrencySettings, Pricing, Sale } from '@ljeducare/shared';
import { formatCurrency, resolvePrice } from '@ljeducare/shared';
import { callFunction } from '@/lib/firebase/client';

type Method = 'paypal' | 'marx' | 'bank_slip';

const METHOD_META: Record<Method, { label: string; hint: string }> = {
    marx: { label: 'Card payment (LKR)', hint: 'Visa/Master via Marx — Sri Lankan cards' },
    paypal: { label: 'PayPal', hint: 'International cards & PayPal balance' },
    bank_slip: { label: 'Bank transfer', hint: 'Pay to the institute account, upload the slip' },
};

/** Currency + payment-method selection → initiateEnrollment → route per path. */
export default function CheckoutClient({
    itemType,
    itemId,
    itemTitle,
    pricing,
    settings,
}: {
    itemType: string;
    itemId: string;
    itemTitle: string;
    pricing: Pricing;
    settings: CurrencySettings;
}) {
    const router = useRouter();
    const [currency, setCurrency] = useState(settings.base);
    const [method, setMethod] = useState<Method>(currency === settings.base ? 'marx' : 'paypal');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const price = useMemo(() => {
        try {
            return resolvePrice(pricing, currency, settings);
        } catch {
            return null;
        }
    }, [pricing, currency, settings]);

    const isFree = !price || price.amount === 0;
    // Marx is LKR-only; PayPal doesn't process LKR — constrain methods by currency.
    const methods: Method[] =
        currency === settings.base ? ['marx', 'bank_slip'] : ['paypal', 'bank_slip'];

    function selectCurrency(next: string) {
        setCurrency(next);
        setMethod(next === settings.base ? 'marx' : 'paypal');
    }

    async function handlePay() {
        setBusy(true);
        setError(null);
        try {
            const res = await callFunction<
                { itemId: string; itemType: string; currency: string; method: Method },
                { sale?: Sale; enrolled?: boolean; alreadyEnrolled?: boolean }
            >('initiateEnrollment', { itemId, itemType, currency, method });

            if (res.alreadyEnrolled || res.enrolled) {
                router.push(res.sale ? `/payment/success/${res.sale.id}` : '/student');
                return;
            }
            const sale = res.sale!;
            if (method === 'bank_slip') {
                router.push(`/payment/slip/${sale.id}`);
                return;
            }
            if (method === 'paypal') {
                const order = await callFunction<{ saleId: string }, { approveUrl?: string | null; alreadyCompleted?: boolean }>(
                    'paypalCreateOrder',
                    { saleId: sale.id },
                );
                if (order.alreadyCompleted) {
                    router.push(`/payment/success/${sale.id}`);
                    return;
                }
                if (!order.approveUrl) throw new Error('PayPal did not return an approval link.');
                window.location.assign(order.approveUrl);
                return;
            }
            // marx — gateway port lands with the Marx integration step
            setError('Card payments are being configured — please use bank transfer for now.');
        } catch (e: unknown) {
            setError((e as Error)?.message ?? 'Payment could not be started.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-5">
            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}

            {!isFree && settings.enabled.length > 1 && (
                <section className="card space-y-2">
                    <h2 className="text-sm font-semibold">Currency</h2>
                    <div className="flex flex-wrap gap-2">
                        {settings.enabled.map((ccy) => (
                            <button
                                key={ccy}
                                type="button"
                                onClick={() => selectCurrency(ccy)}
                                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                                    currency === ccy
                                        ? 'border-primary bg-primary text-white'
                                        : 'border-light-border hover:border-primary dark:border-dark-border'
                                }`}
                            >
                                {ccy}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <section className="card flex items-center justify-between">
                <span className="text-sm text-light-subtle dark:text-dark-subtle">{itemTitle}</span>
                <span className="text-2xl font-bold">
                    {isFree ? 'Free' : price ? formatCurrency(price) : '—'}
                </span>
            </section>

            {!isFree && (
                <section className="card space-y-2">
                    <h2 className="text-sm font-semibold">Payment method</h2>
                    {methods.map((m) => (
                        <label
                            key={m}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                                method === m ? 'border-primary bg-primary/5' : 'border-light-border dark:border-dark-border'
                            }`}
                        >
                            <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} />
                            <span>
                                <span className="block font-medium">{METHOD_META[m].label}</span>
                                <span className="block text-xs text-light-subtle dark:text-dark-subtle">
                                    {METHOD_META[m].hint}
                                </span>
                            </span>
                        </label>
                    ))}
                </section>
            )}

            <button type="button" onClick={handlePay} disabled={busy || (!isFree && !price)} className="btn-primary w-full py-3">
                {busy ? 'Processing…' : isFree ? 'Enroll for Free' : `Pay ${price ? formatCurrency(price) : ''}`}
            </button>
        </div>
    );
}
