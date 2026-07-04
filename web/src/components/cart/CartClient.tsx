'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CurrencySettings } from '@ljeducare/shared';
import { formatCurrency, resolvePrice } from '@ljeducare/shared';
import { useCart } from '@/providers/CartProvider';
import { callFunction } from '@/lib/firebase/client';

type Method = 'paypal' | 'marx' | 'bank_slip';

const METHOD_META: Record<Method, { label: string; hint: string }> = {
    marx: { label: 'Card payment (LKR)', hint: 'Visa/Master via Marx — Sri Lankan cards' },
    paypal: { label: 'PayPal', hint: 'International cards & PayPal balance' },
    bank_slip: { label: 'Bank transfer', hint: 'Pay to the institute account, upload one slip' },
};

/** Cart review + one unified checkout across multiple teachers (courses + quizzes). */
export default function CartClient({ settings }: { settings: CurrencySettings }) {
    const router = useRouter();
    const { items, remove } = useCart();
    const [currency, setCurrency] = useState(settings.base);
    const [method, setMethod] = useState<Method>(currency === settings.base ? 'marx' : 'paypal');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const priced = useMemo(
        () =>
            items.map((it) => {
                let amount = 0;
                try { amount = resolvePrice(it.pricing, currency, settings).amount; } catch { amount = 0; }
                return { ...it, amount };
            }),
        [items, currency, settings],
    );
    const total = priced.reduce((s, i) => s + i.amount, 0);
    const allFree = total === 0;
    const methods: Method[] = currency === settings.base ? ['marx', 'bank_slip'] : ['paypal', 'bank_slip'];

    function selectCurrency(next: string) {
        setCurrency(next);
        setMethod(next === settings.base ? 'marx' : 'paypal');
    }

    async function checkout() {
        setBusy(true); setError(null);
        try {
            const payload = { items: items.map((i) => ({ itemId: i.itemId, itemType: i.itemType })), currency, method };
            const res = await callFunction<typeof payload, { orderId?: string; enrolled?: boolean }>('initiateCartCheckout', payload);
            if (allFree || res.enrolled) {
                router.push(res.orderId ? `/payment/order/${res.orderId}` : '/student');
                return;
            }
            const orderId = res.orderId!;
            if (method === 'bank_slip') {
                router.push(`/payment/order/${orderId}`);
                return;
            }
            if (method === 'paypal') {
                const order = await callFunction<{ orderId: string }, { approveUrl?: string | null }>('paypalCreateCartOrder', { orderId });
                if (!order.approveUrl) throw new Error('PayPal did not return an approval link.');
                window.location.assign(order.approveUrl);
                return;
            }
            setError('Card payments are being configured — please use bank transfer for now.');
        } catch (e: unknown) {
            const err = e as { message?: string; code?: string };
            if (err.code === 'functions/unauthenticated' || (err.message ?? '').toLowerCase().includes('sign-in')) {
                router.push('/login?next=/cart');
                return;
            }
            setError(err.message ?? 'Checkout could not be started.');
        } finally {
            setBusy(false);
        }
    }

    if (items.length === 0) {
        return (
            <div className="card text-center">
                <p className="text-lg font-semibold">Your cart is empty</p>
                <p className="mt-1 text-sm text-light-subtle dark:text-dark-subtle">Add courses and quizzes to buy them together.</p>
                <Link href="/categories" className="btn-primary mt-4 inline-flex">Browse categories</Link>
            </div>
        );
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-3">
                {priced.map((it) => (
                    <div key={`${it.itemType}:${it.itemId}`} className="card flex items-center gap-4 py-3">
                        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-primary/10">
                            {it.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={it.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-xl">{it.itemType === 'quiz' ? '❓' : '📚'}</div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{it.title}</p>
                            <p className="text-xs capitalize text-light-subtle dark:text-dark-subtle">
                                {it.itemType}{it.teacherName ? ` · ${it.teacherName}` : ''}
                            </p>
                        </div>
                        <span className="font-semibold">{it.amount === 0 ? 'Free' : formatCurrency({ amount: it.amount, currency })}</span>
                        <button type="button" onClick={() => remove(it.itemType, it.itemId)} className="text-sm text-red-600 hover:underline">Remove</button>
                    </div>
                ))}
            </div>

            <aside className="space-y-4">
                {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

                {!allFree && settings.enabled.length > 1 && (
                    <section className="card space-y-2">
                        <h2 className="text-sm font-semibold">Currency</h2>
                        <div className="flex flex-wrap gap-2">
                            {settings.enabled.map((ccy) => (
                                <button key={ccy} type="button" onClick={() => selectCurrency(ccy)}
                                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${currency === ccy ? 'border-primary bg-primary text-white' : 'border-light-border hover:border-primary dark:border-dark-border'}`}>
                                    {ccy}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                <section className="card flex items-center justify-between">
                    <span className="text-sm text-light-subtle dark:text-dark-subtle">Total</span>
                    <span className="text-2xl font-bold">{allFree ? 'Free' : formatCurrency({ amount: total, currency })}</span>
                </section>

                {!allFree && (
                    <section className="card space-y-2">
                        <h2 className="text-sm font-semibold">Payment method</h2>
                        {methods.map((m) => (
                            <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${method === m ? 'border-primary bg-primary/5' : 'border-light-border dark:border-dark-border'}`}>
                                <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} />
                                <span>
                                    <span className="block font-medium">{METHOD_META[m].label}</span>
                                    <span className="block text-xs text-light-subtle dark:text-dark-subtle">{METHOD_META[m].hint}</span>
                                </span>
                            </label>
                        ))}
                    </section>
                )}

                <button type="button" onClick={checkout} disabled={busy} className="btn-primary w-full py-3">
                    {busy ? 'Processing…' : allFree ? 'Enroll for free' : `Checkout ${formatCurrency({ amount: total, currency })}`}
                </button>
                <p className="text-center text-xs text-light-subtle dark:text-dark-subtle">One payment enrolls you in every item.</p>
            </aside>
        </div>
    );
}
