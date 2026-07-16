'use client';

import { useState } from 'react';
import { subscribeNewsletterAction } from '@/app/(landing)/actions';

/** Footer newsletter opt-in. */
export default function LandingNewsletterForm({ successMessage }: { successMessage?: string }) {
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        setError(null);
        const res = await subscribeNewsletterAction(String(fd.get('email') ?? ''), String(fd.get('company') ?? ''));
        setBusy(false);
        if (res.error) {
            setError(res.error);
            return;
        }
        setDone(true);
    }

    if (done) {
        return (
            <p role="status" className="form-success">
                {successMessage || "You're subscribed — thanks!"}
            </p>
        );
    }

    return (
        <>
            <form className="newsletter-form" onSubmit={onSubmit}>
                <input type="email" name="email" placeholder="Your email address" aria-label="Your email address" required />
                {/* Honeypot */}
                <input
                    type="text"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }}
                />
                <button type="submit" className="btn btn-accent" disabled={busy} aria-label="Subscribe">
                    <i className="ph ph-paper-plane-right" />
                </button>
            </form>
            {error && (
                <p role="alert" className="form-error">
                    {error}
                </p>
            )}
        </>
    );
}
