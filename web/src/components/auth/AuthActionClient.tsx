'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Phase =
    | { kind: 'loading' }
    | { kind: 'reset'; email: string } // valid reset code — show new-password form
    | { kind: 'done'; title: string; message: string } // success (reset / verify / recover)
    | { kind: 'error'; message: string };

/**
 * Handles Firebase Auth email action links (?mode=&oobCode=): password reset,
 * email verification, and email-change recovery — an in-app, branded alternative to
 * Firebase's default hosted page. Reads the query from window.location (not
 * useSearchParams) so the page still server-renders. Requires the Firebase console's
 * password-reset "Action URL" to point at /auth/action; otherwise Firebase's own page
 * is used and this is never reached.
 */
export default function AuthActionClient() {
    const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
    const [oobCode, setOobCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode') ?? '';
        const code = params.get('oobCode') ?? '';
        setOobCode(code);

        if (!code) {
            setPhase({ kind: 'error', message: 'This link is missing its security code. Please request a new one.' });
            return;
        }

        (async () => {
            const { getClientAuth } = await import('@/lib/firebase/client');
            const auth = getClientAuth();
            try {
                if (mode === 'resetPassword') {
                    const { verifyPasswordResetCode } = await import('firebase/auth');
                    const email = await verifyPasswordResetCode(auth, code);
                    setPhase({ kind: 'reset', email });
                } else if (mode === 'verifyEmail') {
                    const { applyActionCode } = await import('firebase/auth');
                    await applyActionCode(auth, code);
                    setPhase({ kind: 'done', title: 'Email verified', message: 'Your email address is confirmed. You can log in now.' });
                } else if (mode === 'recoverEmail') {
                    const { applyActionCode } = await import('firebase/auth');
                    await applyActionCode(auth, code);
                    setPhase({ kind: 'done', title: 'Email change reversed', message: 'Your email has been restored. Reset your password if you suspect someone else had access.' });
                } else {
                    setPhase({ kind: 'error', message: 'Unsupported or unknown action.' });
                }
            } catch {
                setPhase({ kind: 'error', message: 'This link is invalid or has expired. Please request a new one.' });
            }
        })();
    }, []);

    async function submitNewPassword(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirm) {
            setError('The two passwords do not match.');
            return;
        }
        setBusy(true);
        try {
            const { getClientAuth } = await import('@/lib/firebase/client');
            const { confirmPasswordReset } = await import('firebase/auth');
            await confirmPasswordReset(getClientAuth(), oobCode, password);
            setPhase({ kind: 'done', title: 'Password updated', message: 'Your password has been changed. Log in with your new password.' });
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code ?? '';
            setError(
                code.includes('weak-password')
                    ? 'Please choose a stronger password.'
                    : 'This link has expired — please request a new reset email.',
            );
        } finally {
            setBusy(false);
        }
    }

    if (phase.kind === 'loading') {
        return <p className="text-center text-sm text-light-subtle dark:text-dark-subtle">Checking your link…</p>;
    }

    if (phase.kind === 'error') {
        return (
            <div className="space-y-4">
                <h1 className="text-xl font-bold">Link problem</h1>
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {phase.message}
                </p>
                <Link href="/forgot-password" className="btn-primary w-full">
                    Request a new link
                </Link>
            </div>
        );
    }

    if (phase.kind === 'done') {
        return (
            <div className="space-y-4">
                <h1 className="text-xl font-bold">{phase.title}</h1>
                <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                    {phase.message}
                </p>
                <Link href="/login" className="btn-primary w-full">
                    Go to log in
                </Link>
            </div>
        );
    }

    // phase.kind === 'reset'
    return (
        <form onSubmit={submitNewPassword} className="space-y-4">
            <h1 className="text-xl font-bold">Set a new password</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                For <span className="font-medium">{phase.email}</span>
            </p>
            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}
            <label className="block">
                <span className="mb-1 block text-sm font-medium">New password</span>
                <input type="password" required autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="block">
                <span className="mb-1 block text-sm font-medium">Confirm new password</span>
                <input type="password" required autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            <button type="submit" disabled={busy} aria-busy={busy} className="btn-primary w-full">
                {busy ? 'Updating…' : 'Update password'}
            </button>
        </form>
    );
}
