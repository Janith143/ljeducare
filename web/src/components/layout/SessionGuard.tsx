'use client';

import { useEffect } from 'react';

/**
 * Registers this device's session on mount (enforcing the device cap server-side)
 * and watches its own session doc — if the device is kicked (another login pushed
 * it past the cap), it signs the user out. Renders nothing.
 */
export default function SessionGuard({ uid }: { uid: string }) {
    useEffect(() => {
        let unsub: (() => void) | undefined;
        let cancelled = false;

        function getDeviceId(): string {
            const key = 'lj_device_id';
            let id = localStorage.getItem(key);
            if (!id) {
                id = crypto.randomUUID();
                localStorage.setItem(key, id);
            }
            return id;
        }

        (async () => {
            const deviceId = getDeviceId();
            try {
                const { callFunction } = await import('@/lib/firebase/client');
                await callFunction('recordLoginEvent', { deviceId, userAgent: navigator.userAgent, app: 'web' });
            } catch {
                /* non-fatal — session still valid, just not capped this load */
            }
            if (cancelled) return;

            const { getClientDb } = await import('@/lib/firebase/client');
            const { doc, onSnapshot } = await import('firebase/firestore');
            unsub = onSnapshot(
                doc(getClientDb(), 'userSessions', `${uid}_${deviceId}`),
                async (snap) => {
                    if (snap.exists() && snap.data().active === false) {
                        const { signOutEverywhere } = await import('@/providers/AuthProvider');
                        await signOutEverywhere();
                    }
                },
                () => {},
            );
        })();

        return () => {
            cancelled = true;
            unsub?.();
        };
    }, [uid]);

    return null;
}
