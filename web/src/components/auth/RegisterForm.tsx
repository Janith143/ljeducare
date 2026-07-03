'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Student self-registration: create the auth user + users/{uid} doc (role student —
 * enforced by Firestore rules), then establish the session cookie.
 */
export default function RegisterForm() {
    const router = useRouter();
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        contactNumber: '',
        password: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    function update(field: keyof typeof form) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm((f) => ({ ...f, [field]: e.target.value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        setBusy(true);
        try {
            const { getClientAuth, getClientDb } = await import('@/lib/firebase/client');
            const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
            const { doc, setDoc } = await import('firebase/firestore');

            const credential = await createUserWithEmailAndPassword(
                getClientAuth(),
                form.email,
                form.password,
            );
            const displayName = `${form.firstName} ${form.lastName}`.trim();
            await updateProfile(credential.user, { displayName });

            await setDoc(doc(getClientDb(), 'users', credential.user.uid), {
                id: credential.user.uid,
                uid: credential.user.uid,
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim().toLowerCase(),
                contactNumber: form.contactNumber.trim(),
                role: 'student',
                avatar: '',
                status: 'active',
                createdAt: new Date().toISOString(),
                registrationSource: 'web',
            });

            const idToken = await credential.user.getIdToken(true);
            const res = await fetch('/api/login', {
                method: 'GET',
                headers: { Authorization: `Bearer ${idToken}` },
            });
            if (!res.ok) throw new Error('session');

            router.push('/student');
            router.refresh();
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code ?? '';
            setError(
                code.includes('email-already-in-use')
                    ? 'An account with this email already exists — try logging in.'
                    : 'Registration failed. Please try again.',
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h1 className="text-xl font-bold">Register as a student</h1>
            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}
            <div className="grid grid-cols-2 gap-3">
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">First name</span>
                    <input required className="input" value={form.firstName} onChange={update('firstName')} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">Last name</span>
                    <input required className="input" value={form.lastName} onChange={update('lastName')} />
                </label>
            </div>
            <label className="block">
                <span className="mb-1 block text-sm font-medium">Email</span>
                <input type="email" required autoComplete="email" className="input" value={form.email} onChange={update('email')} />
            </label>
            <label className="block">
                <span className="mb-1 block text-sm font-medium">Mobile number</span>
                <input type="tel" required className="input" placeholder="07XXXXXXXX or +94…" value={form.contactNumber} onChange={update('contactNumber')} />
            </label>
            <label className="block">
                <span className="mb-1 block text-sm font-medium">Password</span>
                <input type="password" required autoComplete="new-password" className="input" value={form.password} onChange={update('password')} />
            </label>
            <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? 'Creating account…' : 'Create account'}
            </button>
            <p className="text-center text-sm text-light-subtle dark:text-dark-subtle">
                Already registered?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                    Log in
                </Link>
            </p>
        </form>
    );
}
