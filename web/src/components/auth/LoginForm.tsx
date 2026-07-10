'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isRole } from '@ljeducare/shared';
import { roleHomePath } from '@/lib/auth/paths';
import { useHydrated } from '@/hooks/useHydrated';

/** Read the role claim from a Firebase ID token (display/routing only — server re-verifies). */
function roleFromIdToken(idToken: string) {
    try {
        const payload = JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return isRole(payload.role) ? payload.role : undefined;
    } catch {
        return undefined;
    }
}

/** Sign in with Firebase Auth, then trade the ID token for a session cookie. */
export default function LoginForm() {
    const router = useRouter();
    const ready = useHydrated();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Warm the Firebase auth chunk so the first real click signs in without extra latency.
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
            const { signInWithEmailAndPassword } = await import('firebase/auth');
            const credential = await signInWithEmailAndPassword(getClientAuth(), email, password);
            const idToken = await credential.user.getIdToken();

            const res = await fetch('/api/login', {
                method: 'GET',
                headers: { Authorization: `Bearer ${idToken}` },
            });
            if (!res.ok) throw new Error('Could not establish a session. Please try again.');

            const next = new URLSearchParams(window.location.search).get('next');
            const fallback = roleHomePath(roleFromIdToken(idToken));
            router.push(next && next.startsWith('/') ? next : fallback);
            router.refresh();
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code ?? '';
            setError(
                code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')
                    ? 'Incorrect email or password.'
                    : 'Sign-in failed. Please try again.',
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h1 className="text-xl font-bold">Log in to your account</h1>
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
            <label className="block">
                <span className="mb-1 block text-sm font-medium">Password</span>
                <input
                    type="password"
                    required
                    autoComplete="current-password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </label>
            <button type="submit" disabled={busy || !ready} aria-busy={busy} className="btn-primary w-full">
                {busy ? 'Signing in…' : ready ? 'Log in' : 'Loading…'}
            </button>
            <p className="text-center text-sm text-light-subtle dark:text-dark-subtle">
                New student?{' '}
                <Link href="/register" className="font-medium text-primary hover:underline">
                    Create an account
                </Link>
            </p>
        </form>
    );
}
