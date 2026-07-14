'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useHydrated } from '@/hooks/useHydrated';

/** Request a password-reset email via Firebase Auth. */
export default function ForgotPasswordForm() {
    const ready = useHydrated();
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        void import('@/lib/firebase/client');
        void import('firebase/auth');
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!ready) return;
        setError(null);
        setBusy(true);
        try {
            const { getClientAuth } = await import('@/lib/firebase/client');
            const { sendPasswordResetEmail } = await import('firebase/auth');
            await sendPasswordResetEmail(getClientAuth(), email.trim());
            setSent(true);
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code ?? '';
            if (code.includes('invalid-email')) {
                setError('Please enter a valid email address.');
            } else if (code.includes('too-many-requests')) {
                setError('Too many attempts — please wait a few minutes and try again.');
            } else {
                // Don't reveal whether an account exists (e.g. user-not-found) — show success.
                setSent(true);
            }
        } finally {
            setBusy(false);
        }
    }

    if (sent) {
        return (
            <div className="space-y-4">
                <h1 className="text-xl font-bold">Check your email</h1>
                <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                    If an account exists for <span className="font-medium">{email.trim()}</span>, we&apos;ve sent a
                    link to reset your password. The link expires in an hour.
                </p>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Didn&apos;t get it? Check your spam folder, or{' '}
                    <button type="button" onClick={() => setSent(false)} className="font-medium text-primary hover:underline">
                        try another email
                    </button>
                    .
                </p>
                <Link href="/login" className="btn-secondary w-full">
                    Back to log in
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h1 className="text-xl font-bold">Reset your password</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Enter the email on your account and we&apos;ll send you a link to set a new password.
            </p>
            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}
            <label className="block">
                <span className="mb-1 block text-sm font-medium">Email</span>
                <input
                    type="email"
                    required
                    autoComplete="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </label>
            <button type="submit" disabled={busy || !ready} aria-busy={busy} className="btn-primary w-full">
                {busy ? 'Sending…' : ready ? 'Send reset link' : 'Loading…'}
            </button>
            <p className="text-center text-sm text-light-subtle dark:text-dark-subtle">
                Remembered it?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                    Log in
                </Link>
            </p>
        </form>
    );
}
