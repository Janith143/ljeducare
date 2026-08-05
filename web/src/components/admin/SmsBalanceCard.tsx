'use client';

import { useCallback, useEffect, useState } from 'react';
import { callFunction } from '@/lib/firebase/client';

interface SmsBalance {
    configured: boolean;
    senderId: string | null;
    active: boolean;
    balance: number | null;
    error?: string;
    checkedAt?: string;
}

/** Below this, a single class reminder run could exhaust the account. */
const LOW = 50;

/**
 * Remaining Notify.lk credits.
 *
 * Shown wherever credits get spent or governed, because SMS is the one channel that
 * costs money per message and fails silently once the balance hits zero — email and
 * in-app keep working, so nothing else surfaces that SMS stopped.
 */
export default function SmsBalanceCard() {
    const [data, setData] = useState<SmsBalance | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(true);

    const load = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            setData(await callFunction<Record<string, never>, SmsBalance>('getSmsBalance', {}));
        } catch (e: unknown) {
            setError((e as Error)?.message ?? 'Could not read the SMS balance.');
        } finally {
            setBusy(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const balance = data?.balance;
    const low = typeof balance === 'number' && balance <= LOW;

    return (
        <section className="card space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="font-semibold">SMS credits</h2>
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">
                        Remaining balance on the Notify.lk account.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={busy}
                    className="btn-secondary px-2 py-1 text-xs disabled:opacity-50"
                >
                    {busy ? 'Checking…' : 'Refresh'}
                </button>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            {!error && busy && !data && (
                <p className="text-sm text-light-subtle dark:text-dark-subtle">Checking…</p>
            )}

            {!error && data && !data.configured && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                    The SMS gateway is not configured, so no SMS can be sent.
                </p>
            )}

            {!error && data?.configured && data.balance === null && (
                <p className="text-sm text-red-600 dark:text-red-400">
                    Could not reach Notify.lk{data.error ? ` (${data.error})` : ''}. SMS may not be sending.
                </p>
            )}

            {!error && typeof balance === 'number' && (
                <>
                    <p className="flex items-baseline gap-2">
                        <span
                            className={`text-3xl font-bold tabular-nums ${low ? 'text-red-600 dark:text-red-400' : ''}`}
                        >
                            {balance.toLocaleString()}
                        </span>
                        <span className="text-sm text-light-subtle dark:text-dark-subtle">
                            {balance === 1 ? 'credit left' : 'credits left'}
                        </span>
                    </p>
                    {low && (
                        <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Running low. Class reminders send one SMS per enrolled student, twice per class
                            (before and at start), so this can run out quickly. Once it does, SMS fails
                            quietly — email and in-app keep working.
                        </p>
                    )}
                    <p className="text-xs text-light-subtle dark:text-dark-subtle">
                        Sender name: <span className="font-medium">{data?.senderId ?? '—'}</span>
                        {data?.active === false && ' · account inactive'}
                    </p>
                </>
            )}
        </section>
    );
}
