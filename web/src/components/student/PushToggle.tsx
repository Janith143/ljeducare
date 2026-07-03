'use client';

import { useState } from 'react';
import { enablePush } from '@/lib/push';

const MESSAGES: Record<string, string> = {
    ok: 'Push notifications enabled on this device.',
    denied: 'You blocked notifications — enable them in your browser settings.',
    unsupported: 'This browser doesn’t support push notifications.',
    unconfigured: 'Push isn’t configured for the institute yet.',
};

export default function PushToggle({ uid }: { uid: string }) {
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    async function enable() {
        setBusy(true);
        try {
            setStatus(MESSAGES[await enablePush(uid)]);
        } catch {
            setStatus('Could not enable push on this device.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="card space-y-2">
            <h2 className="font-semibold">Push notifications</h2>
            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                Get class announcements as browser/phone notifications on this device.
            </p>
            {status && <p className="text-sm text-light-subtle dark:text-dark-subtle">{status}</p>}
            <button type="button" onClick={enable} disabled={busy} className="btn-secondary px-4 py-1.5 text-sm">
                {busy ? 'Enabling…' : 'Enable push on this device'}
            </button>
        </section>
    );
}
