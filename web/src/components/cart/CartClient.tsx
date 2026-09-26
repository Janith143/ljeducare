'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CurrencySettings } from '@ljeducare/shared';
import { formatCurrency, resolvePrice } from '@ljeducare/shared';
import { quoteCartAction, type CartQuote } from '@/app/(public)/cart/actions';
import { useCart } from '@/providers/CartProvider';
import { callFunction } from '@/lib/firebase/client';

// Card payment (OnePay) is single-item checkout only for now — see CheckoutClient.tsx.
// Cart checkout offers PayPal (foreign currency) + bank transfer until that lands.
type Method = 'paypal' | 'bank_slip';

const METHOD_META: Record<Method, { label: string; hint: string }> = {
    paypal: { label: 'PayPal', hint: 'International cards & PayPal balance' },
    bank_slip: { label: 'Bank transfer', hint: 'Pay to the institute account, upload one slip' },
};

/** Cart review + one unified checkout across multiple teachers (courses + quizzes). */
export default function CartClient({ settings }: { settings: CurrencySettings }) {
    const router = useRouter();
    const { items, remove } = useCart();
    const [currency, setCurrency] = useState(settings.base);
    const [method, setMethod] = useState<Method>(currency === settings.base ? 'bank_slip' : 'paypal');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    // Live prices from the server, tagged with the item set they were fetched for — the
    // localStorage copy of `pricing` is only what the item cost when it was added.
    const [quote, setQuote] = useState<(CartQuote & { keys: string }) | null>(null);
    const [requote, setRequote] = useState(0);
    const keys = items.map((i) => `${i.itemType}:${i.itemId}`).join(',');
    const quoted = quote?.keys === keys;

    useEffect(() => {
        if (!items.length) return;
        let live = true; // a newer item set supersedes this request
        quoteCartAction(items.map(({ itemType, itemId }) => ({ itemType, itemId })))
            .then((q) => {
                if (!live) return;
                const dropped = items.filter((i) => [...q.owned, ...q.unavailable].includes(`${i.itemType}:${i.itemId}`));
                if (!dropped.length) return setQuote({ ...q, keys });
                setNotice(`Removed from your cart (already yours or no longer available): ${dropped.map((i) => i.title).join(', ')}`);
                dropped.forEach((i) => remove(i.itemType, i.itemId)); // changes `keys` → re-quoted
            })
            .catch(() => live && setError('Could not load current prices — refresh the page to try again.'));
        return () => { live = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- re-quote only when the item set changes
    }, [keys, requote]);

    const priced = useMemo(
        () =>
            items.map((it) => {
                let amount = 0;
                const pricing = (quoted && quote?.pricing[`${it.itemType}:${it.itemId}`]) || it.pricing;
                try { amount = resolvePrice(pricing, currency, settings).amount; } catch { amount = 0; }
                return { ...it, amount };
            }),
        [items, currency, settings, quote, quoted],
    );
    const total = priced.reduce((s, i) => s + i.amount, 0);
    const allFree = total === 0;
    const methods: Method[] = currency === settings.base ? ['bank_slip'] : ['paypal', 'bank_slip'];

    function selectCurrency(next: string) {
        setCurrency(next);
        setMethod(next === settings.base ? 'bank_slip' : 'paypal');
    }

    async function checkout() {
        setBusy(true); setError(null);
        try {
            const payload = { items: items.map((i) => ({ itemId: i.itemId, itemType: i.itemType })), currency, method };
            const res = await callFunction<typeof payload, { orderId?: string; enrolled?: boolean; amount?: number }>('initiateCartCheckout', payload);
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
                // Never send the student to PayPal for a different total than the one they
                // just saw (a price changed or an item was skipped since the quote).
                if (Math.abs((res.amount ?? 0) - total) > 0.005) {
                    setError(`Prices changed — your new total is ${formatCurrency({ amount: res.amount ?? 0, currency })}. Please review and check out again.`);
                    setQuote(null);
                    setRequote((n) => n + 1);
                    return;
                }
                const order = await callFunction<{ orderId: string }, { approveUrl?: string | null }>('paypalCreateCartOrder', { orderId });
                if (!order.approveUrl) throw new Error('PayPal did not return an approval link.');
                window.location.assign(order.approveUrl);
                return;
            }
            throw new Error(`Unhandled payment method: ${method}`);
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
                {notice && <p role="status" className="mb-3 text-sm text-amber-700 dark:text-amber-300">{notice}</p>}
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
                {notice && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">{notice}</p>}

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

                <button type="button" onClick={checkout} disabled={busy || !quoted} className="btn-primary w-full py-3">
                    {busy ? 'Processing…' : !quoted ? 'Checking prices…' : allFree ? 'Enroll for free' : `Checkout ${formatCurrency({ amount: total, currency })}`}
                </button>
                <p className="text-center text-xs text-light-subtle dark:text-dark-subtle">One payment enrolls you in every item.</p>
            </aside>
        </div>
    );
}
