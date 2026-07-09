'use client';

import { useEffect } from 'react';

/**
 * Registers this device's session on mount (enforcing the device cap server-side)
 * and watches its own session doc — if the device is kicked (another login pushed
 * it past the cap), it signs the user out. Renders nothing.
 *
 * Also reconciles the client Firebase Auth SDK with the server session: the app's
 * source of truth is the session cookie, but callable Cloud Functions and Firestore
 * listeners authenticate from the client SDK's ID token. When the client SDK has
 * lapsed (no/other user) while the cookie is still valid, `ensureClientSignedIn`
 * signs it back in — otherwise callables fail with "Sign-in required".
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
            // Align the client SDK with the cookie session BEFORE the snapshot listener
            // and any callable (incl. recordLoginEvent below).
            const { callFunction, ensureClientSignedIn } = await import('@/lib/firebase/client');
            await ensureClientSignedIn({ uid });
            if (cancelled) return;
            try {
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
