'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { callFunction } from '@/lib/firebase/client';
import { setAutoRecordAction } from '@/app/teacher/profile/actions';

export interface ZoomState {
    staffId: string;
    connected: boolean;
    email?: string;
    useCustomApp: boolean;
    customClientId?: string;
    autoRecord: boolean;
}

/** Connect a personal Zoom (Pro) account, or register your own Zoom app. */
export default function ZoomConnectionCard({ zoom }: { zoom: ZoomState }) {
    const router = useRouter();
    const params = useSearchParams();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [showCustom, setShowCustom] = useState(zoom.useCustomApp);

    const banner =
        params.get('zoom') === 'connected'
            ? { ok: true, text: 'Zoom account connected.' }
            : params.get('zoom') === 'error'
              ? { ok: false, text: params.get('msg') || 'Zoom connection failed.' }
              : null;

    async function connect() {
        setError(null);
        startTransition(async () => {
            try {
                const { url } = await callFunction<{ staffId: string }, { url: string }>('zoomConnect', { staffId: zoom.staffId });
                window.location.assign(url);
            } catch (e: unknown) {
                setError((e as Error)?.message ?? 'Could not start Zoom connection.');
            }
        });
    }

    async function disconnect() {
        if (!window.confirm('Disconnect your Zoom account? Scheduled meetings stay but new ones can’t be created.')) return;
        startTransition(async () => {
            setError(null);
            try {
                await callFunction('zoomDisconnect', { staffId: zoom.staffId });
                router.refresh();
            } catch (e: unknown) {
                setError((e as Error)?.message ?? 'Failed to disconnect.');
            }
        });
    }

    function saveCustomApp(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        startTransition(async () => {
            setError(null);
            try {
                await callFunction('zoomSetCustomApp', {
                    staffId: zoom.staffId,
                    enabled: true,
                    clientId: String(f.get('clientId') ?? ''),
                    clientSecret: String(f.get('clientSecret') ?? ''),
                });
                router.refresh();
            } catch (e: unknown) {
                setError((e as Error)?.message ?? 'Failed to save app credentials.');
            }
        });
    }

    return (
        <section className="card space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold">Zoom integration</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${zoom.connected ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {zoom.connected ? 'Connected' : 'Not connected'}
                </span>
            </div>

            {banner && (
                <p className={`rounded-lg p-2 text-sm ${banner.ok ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
                    {banner.text}
                </p>
            )}
            {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                Connect your own Zoom Pro account so your live classes are hosted on your plan.
                Students get a unique, non-shareable join link for each class.
            </p>

            {zoom.connected ? (
                <div className="space-y-3">
                    <p className="text-sm">Connected as <span className="font-medium">{zoom.email}</span>{zoom.useCustomApp ? ' (own Zoom app)' : ''}.</p>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            defaultChecked={zoom.autoRecord}
                            disabled={pending}
                            onChange={(e) => startTransition(async () => { await setAutoRecordAction(zoom.staffId, e.target.checked); router.refresh(); })}
                        />
                        Automatically record classes to the Zoom cloud
                    </label>
                    <button type="button" onClick={disconnect} disabled={pending} className="btn-secondary px-4 py-1.5 text-sm text-red-600">
                        Disconnect Zoom
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <button type="button" onClick={connect} disabled={pending} className="btn-primary px-6">
                        {pending ? 'Redirecting…' : 'Connect Zoom account'}
                    </button>
                    <button type="button" onClick={() => setShowCustom((v) => !v)} className="block text-xs text-primary hover:underline">
                        {showCustom ? 'Use the institute’s Zoom app instead' : 'Use my own Zoom app (advanced)'}
                    </button>
                    {showCustom && (
                        <form onSubmit={saveCustomApp} className="space-y-2 rounded-lg border border-light-border p-3 dark:border-dark-border">
                            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                                Create a Server-to-Server or OAuth app in the Zoom Marketplace and paste its Client ID/Secret.
                            </p>
                            <input name="clientId" placeholder="Zoom Client ID" defaultValue={zoom.customClientId} required className="input" />
                            <input name="clientSecret" type="password" placeholder="Zoom Client Secret" required className="input" />
                            <button type="submit" disabled={pending} className="btn-secondary px-4 py-1.5 text-sm">Save app &amp; continue</button>
                        </form>
                    )}
                </div>
            )}
        </section>
    );
}
