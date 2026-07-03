'use client';

import { useState } from 'react';
import { callFunction } from '@/lib/firebase/client';

/** Mints a unique, approved Zoom join link for this student, then opens it. */
export default function ZoomJoinButton({ classId }: { classId: string }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function join() {
        setBusy(true);
        setError(null);
        try {
            // A stable-ish device hint (best-effort; server tracks the active session).
            const deviceHash = `${navigator.userAgent.slice(0, 40)}|${screen.width}x${screen.height}`;
            const { joinUrl } = await callFunction<{ classId: string; deviceHash: string }, { joinUrl: string }>(
                'joinZoomClass',
                { classId, deviceHash },
            );
            window.open(joinUrl, '_blank', 'noopener');
        } catch (e: unknown) {
            const msg = (e as Error)?.message ?? 'Could not get your join link.';
            setError(msg.includes('RENEW_REQUIRED') ? 'renew' : msg);
        } finally {
            setBusy(false);
        }
    }

    if (error === 'renew') {
        return (
            <a href={`/checkout/class/${classId}`} className="btn-primary">
                Renew to join
            </a>
        );
    }

    return (
        <span className="inline-flex flex-col items-end gap-1">
            {error && <span className="text-xs text-red-600">{error}</span>}
            <button type="button" onClick={join} disabled={busy} className="btn-primary">
                {busy ? 'Getting link…' : 'Join Now'}
            </button>
        </span>
    );
}
