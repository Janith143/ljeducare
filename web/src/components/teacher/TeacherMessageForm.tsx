'use client';

import { useState } from 'react';
import type { ChannelFlags } from '@ljeducare/shared';
import { callFunction } from '@/lib/firebase/client';

interface ClassOpt {
    id: string;
    title: string;
}

interface SendResult {
    recipients: number;
    inApp: number;
    email: number;
    sms: number;
    note?: string;
    blocked?: { email?: boolean; sms?: boolean };
}

/** Compose a message to your own enrolled students. */
export default function TeacherMessageForm({ classes, allowed }: { classes: ClassOpt[]; allowed: ChannelFlags }) {
    const [classId, setClassId] = useState('all');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [link, setLink] = useState('');
    const [channels, setChannels] = useState({ inApp: true, email: false, sms: false });
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<SendResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function send() {
        if (!title.trim() || !body.trim()) {
            setError('Add a title and a message.');
            return;
        }
        if (channels.sms && !confirm('Send by SMS? Each student costs one SMS credit.')) return;

        setBusy(true);
        setError(null);
        setResult(null);
        try {
            const res = await callFunction<
                { classId: string; title: string; body: string; link?: string; channels: typeof channels },
                SendResult
            >('sendTeacherMessage', { classId, title: title.trim(), body: body.trim(), link: link.trim() || undefined, channels });
            setResult(res);
            setTitle('');
            setBody('');
            setLink('');
        } catch (e: unknown) {
            setError((e as Error)?.message ?? 'Could not send.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="card space-y-4">
            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}
            {result && (
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                    {result.note ?? (
                        <>
                            Sent to {result.recipients} student{result.recipients === 1 ? '' : 's'} — {result.inApp} in-app
                            · {result.email} email · {result.sms} SMS.
                        </>
                    )}
                    {(result.blocked?.email || result.blocked?.sms) && (
                        <p className="mt-1 text-xs">
                            {[result.blocked.email && 'Email', result.blocked.sms && 'SMS'].filter(Boolean).join(' and ')}{' '}
                            {result.blocked.email && result.blocked.sms ? 'are' : 'is'} turned off for teacher messages —
                            ask an admin to enable {result.blocked.email && result.blocked.sms ? 'them' : 'it'} in Settings.
                        </p>
                    )}
                </div>
            )}

            <label className="block">
                <span className="mb-1 block text-sm font-medium">Send to</span>
                <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
                    <option value="all">All my students ({classes.length} classes)</option>
                    {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.title}
                        </option>
                    ))}
                </select>
            </label>

            <label className="block">
                <span className="mb-1 block text-sm font-medium">Title</span>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Class rescheduled" />
            </label>

            <label className="block">
                <span className="mb-1 block text-sm font-medium">Message</span>
                <textarea className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} placeholder="Tomorrow's class moves to 4pm." />
            </label>

            <label className="block">
                <span className="mb-1 block text-sm font-medium">Link (optional)</span>
                <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
            </label>

            <div>
                <span className="mb-2 block text-sm font-medium">Channels</span>
                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={channels.inApp} disabled={!allowed.inApp} onChange={(e) => setChannels((c) => ({ ...c, inApp: e.target.checked }))} />
                        In-app {!allowed.inApp && <span className="text-xs text-light-subtle">(off)</span>}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={channels.email} disabled={!allowed.email} onChange={(e) => setChannels((c) => ({ ...c, email: e.target.checked }))} />
                        Email {!allowed.email && <span className="text-xs text-light-subtle">(off)</span>}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={channels.sms} disabled={!allowed.sms} onChange={(e) => setChannels((c) => ({ ...c, sms: e.target.checked }))} />
                        SMS {!allowed.sms && <span className="text-xs text-light-subtle">(off)</span>}
                    </label>
                </div>
                {!allowed.sms && (
                    <p className="mt-1 text-xs text-light-subtle dark:text-dark-subtle">
                        SMS is disabled for teacher messages. An admin can turn it on in Settings → Notifications.
                    </p>
                )}
                {allowed.sms && channels.sms && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                        SMS costs one credit per student.
                    </p>
                )}
            </div>

            <button type="button" onClick={send} disabled={busy} className="btn-primary">
                {busy ? 'Sending…' : 'Send message'}
            </button>
        </section>
    );
}
