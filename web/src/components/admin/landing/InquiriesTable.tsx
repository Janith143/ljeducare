'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InquiryStatus, LandingInquiry, NewsletterSubscriber } from '@ljeducare/shared';
import {
    deleteInquiryAction,
    removeSubscriberAction,
    updateInquiryStatusAction,
} from '@/app/admin/landing-page/actions';

const STATUSES: InquiryStatus[] = ['new', 'read', 'replied', 'archived'];

const STATUS_STYLES: Record<InquiryStatus, string> = {
    new: 'bg-primary/10 text-primary',
    read: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    replied: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    archived: 'bg-light-background text-light-subtle dark:bg-dark-background dark:text-dark-subtle',
};

function csvEscape(v: string) {
    return `"${(v ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
    const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
    // BOM so Excel reads UTF-8 (names/messages may be non-ASCII).
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default function InquiriesTable({
    inquiries,
    subscribers,
}: {
    inquiries: LandingInquiry[];
    subscribers: NewsletterSubscriber[];
}) {
    const router = useRouter();
    const [tab, setTab] = useState<'inquiries' | 'subscribers'>('inquiries');
    const [filter, setFilter] = useState<InquiryStatus | 'all'>('all');
    const [open, setOpen] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const shown = useMemo(
        () => (filter === 'all' ? inquiries : inquiries.filter((i) => i.status === filter)),
        [inquiries, filter],
    );
    const newCount = inquiries.filter((i) => i.status === 'new').length;

    async function setStatus(id: string, status: InquiryStatus) {
        setBusy(id);
        await updateInquiryStatusAction(id, status);
        setBusy(null);
        router.refresh();
    }

    async function remove(id: string) {
        if (!confirm('Delete this inquiry permanently?')) return;
        setBusy(id);
        await deleteInquiryAction(id);
        setBusy(null);
        router.refresh();
    }

    async function removeSub(id: string) {
        if (!confirm('Remove this subscriber?')) return;
        setBusy(id);
        await removeSubscriberAction(id);
        setBusy(null);
        router.refresh();
    }

    return (
        <div className="space-y-4">
            <nav className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setTab('inquiries')}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${tab === 'inquiries' ? 'border-primary bg-primary text-white' : 'border-light-border dark:border-dark-border'}`}
                >
                    Inquiries ({inquiries.length}){newCount > 0 && tab !== 'inquiries' ? ` · ${newCount} new` : ''}
                </button>
                <button
                    type="button"
                    onClick={() => setTab('subscribers')}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${tab === 'subscribers' ? 'border-primary bg-primary text-white' : 'border-light-border dark:border-dark-border'}`}
                >
                    Newsletter ({subscribers.length})
                </button>
            </nav>

            {tab === 'inquiries' ? (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        {(['all', ...STATUSES] as const).map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setFilter(s)}
                                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${filter === s ? 'border-primary text-primary' : 'border-light-border text-light-subtle dark:border-dark-border dark:text-dark-subtle'}`}
                            >
                                {s}
                                {s === 'new' && newCount > 0 ? ` (${newCount})` : ''}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="ml-auto btn-secondary text-xs"
                            disabled={shown.length === 0}
                            onClick={() =>
                                downloadCsv('inquiries.csv', [
                                    ['Date', 'Name', 'Email', 'Phone', 'Program', 'Status', 'Message'],
                                    ...shown.map((i) => [
                                        i.createdAt,
                                        i.name,
                                        i.email,
                                        i.phone ?? '',
                                        i.program ?? '',
                                        i.status,
                                        i.message,
                                    ]),
                                ])
                            }
                        >
                            Export CSV
                        </button>
                    </div>

                    {shown.length === 0 ? (
                        <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                            No inquiries{filter === 'all' ? ' yet' : ` marked “${filter}”`}. Messages sent from the
                            landing page contact form land here.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {shown.map((i) => {
                                const expanded = open === i.id;
                                return (
                                    <li key={i.id} className="card space-y-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[i.status]}`}>
                                                {i.status}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">{i.name}</p>
                                                <p className="truncate text-xs text-light-subtle dark:text-dark-subtle">
                                                    {i.email}
                                                    {i.phone ? ` · ${i.phone}` : ''}
                                                    {i.program ? ` · ${i.program}` : ''}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-xs text-light-subtle dark:text-dark-subtle">
                                                {new Date(i.createdAt).toLocaleString()}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setOpen(expanded ? null : i.id);
                                                    if (!expanded && i.status === 'new') setStatus(i.id, 'read');
                                                }}
                                                className="shrink-0 text-sm font-medium text-primary hover:underline"
                                            >
                                                {expanded ? 'Hide' : 'View'}
                                            </button>
                                        </div>

                                        {expanded && (
                                            <div className="space-y-3 border-t border-light-border pt-3 dark:border-dark-border">
                                                <p className="whitespace-pre-wrap text-sm">{i.message}</p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <a href={`mailto:${i.email}`} className="btn-primary text-xs">
                                                        Reply by email
                                                    </a>
                                                    {i.phone && (
                                                        <a
                                                            href={`https://wa.me/${i.phone.replace(/[^\d]/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="btn-secondary text-xs"
                                                        >
                                                            WhatsApp
                                                        </a>
                                                    )}
                                                    {STATUSES.filter((s) => s !== i.status).map((s) => (
                                                        <button
                                                            key={s}
                                                            type="button"
                                                            disabled={busy === i.id}
                                                            onClick={() => setStatus(i.id, s)}
                                                            className="rounded-full border border-light-border px-3 py-1 text-xs font-medium capitalize hover:border-primary dark:border-dark-border"
                                                        >
                                                            Mark {s}
                                                        </button>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        disabled={busy === i.id}
                                                        onClick={() => remove(i.id)}
                                                        className="ml-auto text-xs font-medium text-red-600 hover:underline"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            ) : (
                <>
                    <div className="flex items-center">
                        <button
                            type="button"
                            className="ml-auto btn-secondary text-xs"
                            disabled={subscribers.length === 0}
                            onClick={() =>
                                downloadCsv('newsletter-subscribers.csv', [
                                    ['Email', 'Subscribed'],
                                    ...subscribers.map((s) => [s.email, s.createdAt]),
                                ])
                            }
                        >
                            Export CSV
                        </button>
                    </div>
                    {subscribers.length === 0 ? (
                        <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                            No subscribers yet. Sign-ups from the landing page footer land here.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {subscribers.map((s) => (
                                <li key={s.id} className="card flex items-center gap-3 py-3">
                                    <span className="min-w-0 flex-1 truncate text-sm">{s.email}</span>
                                    <span className="shrink-0 text-xs text-light-subtle dark:text-dark-subtle">
                                        {new Date(s.createdAt).toLocaleDateString()}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={busy === s.id}
                                        onClick={() => removeSub(s.id)}
                                        className="shrink-0 text-xs font-medium text-red-600 hover:underline"
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
