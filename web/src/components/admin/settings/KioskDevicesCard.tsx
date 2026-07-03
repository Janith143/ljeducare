'use client';

import { useState, useTransition } from 'react';
import { callFunction } from '@/lib/firebase/client';

/** Generate kiosk pairing codes (main_admin). Device enters the code at /kiosk-pair. */
export default function KioskDevicesCard() {
    const [pending, startTransition] = useTransition();
    const [label, setLabel] = useState('');
    const [result, setResult] = useState<{ code: string; expiresAt: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    function generate() {
        startTransition(async () => {
            setError(null);
            setResult(null);
            try {
                const res = await callFunction<{ label: string }, { code: string; expiresAt: string }>(
                    'createKioskPairingCode',
                    { label: label.trim() || 'Front desk kiosk' },
                );
                setResult(res);
            } catch (e: unknown) {
                setError((e as Error)?.message ?? 'Could not create a pairing code.');
            }
        });
    }

    return (
        <section className="card space-y-3">
            <h2 className="font-semibold">Kiosk devices</h2>
            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                Generate a one-time code, then open <span className="font-mono">/kiosk-pair</span> on
                the tablet and enter it. The device becomes a dedicated attendance scanner.
            </p>
            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
            )}
            <div className="flex gap-2">
                <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Device label (e.g. Front desk tablet)"
                    className="input flex-1"
                />
                <button type="button" onClick={generate} disabled={pending} className="btn-primary px-4 text-sm">
                    {pending ? '…' : 'Generate code'}
                </button>
            </div>
            {result && (
                <div className="rounded-lg bg-primary/10 p-4 text-center">
                    <p className="text-3xl font-bold tracking-[0.4em] text-primary">{result.code}</p>
                    <p className="mt-1 text-xs text-light-subtle dark:text-dark-subtle">
                        Valid until {new Date(result.expiresAt).toLocaleTimeString()} — enter it on the device now.
                    </p>
                </div>
            )}
        </section>
    );
}
