'use client';

import { useState } from 'react';
import { callFunction } from '@/lib/firebase/client';

/** Exchange a 6-digit pairing code for a kiosk session on this device. */
export default function KioskPairClient() {
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handlePair(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const { token } = await callFunction<{ code: string }, { token: string; label: string | null }>(
                'exchangeKioskPairingCode',
                { code: code.trim() },
            );
            const { getClientAuth } = await import('@/lib/firebase/client');
            const { signInWithCustomToken } = await import('firebase/auth');
            const credential = await signInWithCustomToken(getClientAuth(), token);
            const idToken = await credential.user.getIdToken();
            const res = await fetch('/api/login', { headers: { Authorization: `Bearer ${idToken}` } });
            if (!res.ok) throw new Error('Session could not be established.');
            window.location.assign('/kiosk');
        } catch (e: unknown) {
            setError((e as Error)?.message ?? 'Pairing failed — check the code with your admin.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={handlePair} className="card w-full max-w-sm space-y-4 p-6">
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Ask your administrator for a pairing code (Admin → Settings → Kiosk devices), then
                enter it below. This device becomes an attendance scanner.
            </p>
            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}
            <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="6-digit code"
                className="input text-center text-2xl tracking-[0.5em]"
            />
            <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full py-3">
                {busy ? 'Pairing…' : 'Pair this device'}
            </button>
        </form>
    );
}
