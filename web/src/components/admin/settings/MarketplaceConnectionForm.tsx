'use client';

import { useState } from 'react';
import { saveMarketplaceConnectionAction } from '@/app/admin/settings/actions';

/**
 * Pair this institute with the clazz.lk marketplace. The hub's admin generates a one-time key
 * and sends it over; pasting it here is the ENTIRE setup — no environment variable, no code
 * change, no redeploy. The key is stored server-side (Firestore rules deny all client access)
 * and is used to verify the hub's signed connector calls.
 */
export default function MarketplaceConnectionForm({
    initial,
}: {
    initial: { configured: boolean; enabled: boolean; updatedAt?: string | null; providerId?: string; hubUrl?: string };
}) {
    const [hubKey, setHubKey] = useState('');
    const [providerId, setProviderId] = useState(initial.providerId ?? '');
    const [enabled, setEnabled] = useState(initial.enabled);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const res = await saveMarketplaceConnectionAction({
            hubKey: hubKey.trim() || undefined,
            providerId: providerId.trim() || undefined,
            enabled,
        });
        setMsg(res?.error ? { ok: false, text: res.error } : { ok: true, text: 'Marketplace connection saved.' });
        if (!res?.error) setHubKey('');
        setBusy(false);
    }

    return (
        <section className="card space-y-3">
            <div>
                <h2 className="font-semibold">clazz.lk Marketplace</h2>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Lets clazz.lk list and sell this institute&apos;s published classes and courses. Paste the
                    connection key their admin gives you — that&apos;s the whole setup.
                </p>
            </div>

            <p className="text-sm">
                Status:{' '}
                <span className={initial.configured ? 'font-semibold text-green-600' : 'text-light-subtle dark:text-dark-subtle'}>
                    {initial.configured ? (initial.enabled ? 'Connected' : 'Connected (paused)') : 'Not connected'}
                </span>
                {initial.updatedAt && (
                    <span className="text-light-subtle dark:text-dark-subtle"> · updated {new Date(initial.updatedAt).toLocaleString()}</span>
                )}
            </p>

            <form onSubmit={submit} className="space-y-3">
                <label className="block text-sm">
                    <span className="mb-1 block font-medium">Connection key</span>
                    <input
                        type="password"
                        value={hubKey}
                        onChange={(e) => setHubKey(e.target.value)}
                        placeholder={initial.configured ? '•••••••• (leave blank to keep current)' : 'Paste the key from clazz.lk'}
                        className="input w-full font-mono"
                        autoComplete="off"
                    />
                    <span className="mt-1 block text-xs text-light-subtle dark:text-dark-subtle">
                        Stored server-side only. If you rotate it on the clazz.lk side, paste the new key here.
                    </span>
                </label>

                <label className="block text-sm">
                    <span className="mb-1 block font-medium">Our partner ID</span>
                    <input
                        value={providerId}
                        onChange={(e) => setProviderId(e.target.value.toUpperCase())}
                        placeholder="e.g. LJE"
                        className="input w-full font-mono"
                        autoComplete="off"
                    />
                    <span className="mt-1 block text-xs text-light-subtle dark:text-dark-subtle">
                        The short code clazz.lk assigned us. Needed to pull our earnings report — see{' '}
                        <a href="/admin/marketplace-revenue" className="underline">clazz.lk Revenue</a>.
                    </span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                    <span>Allow clazz.lk to sync and sell our published content</span>
                </label>

                {msg && (
                    <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
                )}

                <button type="submit" disabled={busy} className="btn-primary">
                    {busy ? 'Saving…' : 'Save'}
                </button>
            </form>
        </section>
    );
}
