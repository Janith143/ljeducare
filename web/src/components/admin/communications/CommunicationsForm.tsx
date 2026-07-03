'use client';

import { useState, useTransition } from 'react';
import { callFunction } from '@/lib/firebase/client';

interface Result {
    recipients: number;
    inApp: number;
    email: number;
    sms: number;
    push: number;
}

/** Compose + send a broadcast to students across channels. */
export default function CommunicationsForm({ classes }: { classes: { id: string; title: string }[] }) {
    const [pending, startTransition] = useTransition();
    const [result, setResult] = useState<Result | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [channels, setChannels] = useState({ inApp: true, email: false, sms: false, push: false });

    function toggle(k: keyof typeof channels) {
        setChannels((c) => ({ ...c, [k]: !c[k] }));
    }

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        startTransition(async () => {
            setError(null);
            setResult(null);
            try {
                const res = await callFunction<
                    { audience: string; title: string; body: string; link?: string; channels: typeof channels },
                    Result & { success: boolean }
                >('sendBulkMessage', {
                    audience: String(f.get('audience') ?? 'all_students'),
                    title: String(f.get('title') ?? ''),
                    body: String(f.get('body') ?? ''),
                    link: String(f.get('link') ?? '') || undefined,
                    channels,
                });
                setResult(res);
            } catch (e: unknown) {
                setError((e as Error)?.message ?? 'Send failed.');
            }
        });
    }

    return (
        <form onSubmit={submit} className="card max-w-2xl space-y-3">
            {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
            {result && (
                <p className="rounded-lg bg-green-50 p-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                    Sent to {result.recipients} students — {result.inApp} in-app · {result.email} email · {result.sms} SMS · {result.push} push.
                </p>
            )}

            <label className="block text-sm">
                <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Audience</span>
                <select name="audience" className="input">
                    <option value="all_students">All students</option>
                    {classes.map((c) => (
                        <option key={c.id} value={`class:${c.id}`}>Enrolled in: {c.title}</option>
                    ))}
                </select>
            </label>

            <input name="title" required placeholder="Title" className="input" />
            <textarea name="body" required rows={4} placeholder="Message…" className="input" />
            <input name="link" type="url" placeholder="Link (optional)" className="input" />

            <fieldset>
                <legend className="mb-1 text-sm font-medium">Channels</legend>
                <div className="flex flex-wrap gap-3 text-sm">
                    {(['inApp', 'email', 'sms', 'push'] as const).map((k) => (
                        <label key={k} className="flex items-center gap-1">
                            <input type="checkbox" checked={channels[k]} onChange={() => toggle(k)} />
                            {k === 'inApp' ? 'In-app' : k.toUpperCase()}
                        </label>
                    ))}
                </div>
                <p className="mt-1 text-xs text-light-subtle dark:text-dark-subtle">
                    Email/SMS/push require the matching credentials to be configured; in-app always works.
                </p>
            </fieldset>

            <button
                type="submit"
                disabled={pending || !Object.values(channels).some(Boolean)}
                className="btn-primary"
            >
                {pending ? 'Sending…' : 'Send message'}
            </button>
        </form>
    );
}
