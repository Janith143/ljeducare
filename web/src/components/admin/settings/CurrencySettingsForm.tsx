'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CurrencySettings } from '@ljeducare/shared';
import { saveCurrencySettingsAction } from '@/app/admin/settings/actions';

type Row = { key: string; code: string; rate: string };

/** Manage enabled currencies + LKR-relative exchange rates. */
export default function CurrencySettingsForm({ settings }: { settings: CurrencySettings }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ ok?: boolean; text: string } | null>(null);
    const [rows, setRows] = useState<Row[]>(
        settings.enabled
            .filter((c) => c !== 'LKR')
            .map((c, i) => ({ key: `r${i}`, code: c, rate: String(settings.rates[c]?.rate ?? '') })),
    );

    function save() {
        startTransition(async () => {
            setMessage(null);
            const result = await saveCurrencySettingsAction({
                enabled: rows.map((r) => r.code),
                rates: Object.fromEntries(rows.map((r) => [r.code.toUpperCase().trim(), Number(r.rate)])),
            });
            if (result.error) setMessage({ text: result.error });
            else {
                setMessage({ ok: true, text: 'Currencies saved. Public prices update within a few minutes.' });
                router.refresh();
            }
        });
    }

    return (
        <section className="card space-y-3">
            <h2 className="font-semibold">Currencies &amp; exchange rates</h2>
            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                Base currency is LKR. Rates are &ldquo;1 LKR = ? foreign&rdquo; (e.g. USD 0.0031 ≈ 322 LKR/USD).
                Per-item USD overrides beat these computed rates.
            </p>
            {message && (
                <p role="status" className={`rounded-lg p-2 text-sm ${message.ok ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
                    {message.text}
                </p>
            )}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                    <span className="w-24 rounded-lg border border-light-border px-3 py-2 font-semibold dark:border-dark-border">LKR</span>
                    <span className="text-light-subtle dark:text-dark-subtle">Base currency (always enabled)</span>
                </div>
                {rows.map((row) => (
                    <div key={row.key} className="flex items-center gap-2">
                        <input
                            value={row.code}
                            onChange={(e) => setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, code: e.target.value.toUpperCase() } : r)))}
                            maxLength={3}
                            placeholder="USD"
                            className="input w-24 uppercase"
                        />
                        <input
                            value={row.rate}
                            onChange={(e) => setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, rate: e.target.value } : r)))}
                            type="number"
                            step="0.0001"
                            min="0"
                            placeholder="1 LKR = ?"
                            className="input w-40"
                        />
                        <button
                            type="button"
                            onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                            className="text-xs text-red-600 hover:underline"
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setRows((rs) => [...rs, { key: `r${Date.now()}`, code: '', rate: '' }])}
                    className="btn-secondary px-3 py-1.5 text-sm"
                >
                    + Add currency
                </button>
                <button type="button" onClick={save} disabled={pending} className="btn-primary px-4 py-1.5 text-sm">
                    {pending ? 'Saving…' : 'Save currencies'}
                </button>
            </div>
        </section>
    );
}
