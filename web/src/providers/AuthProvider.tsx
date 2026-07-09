'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import type { Permission, Role } from '@ljeducare/shared';

/** Server-hydrated session user for client islands (no logged-out flash). */
export interface ClientUser {
    uid: string;
    email: string | null;
    name: string | null;
    role: Role;
    sid?: string;
    tid?: string;
    perms: Permission[];
}

const AuthContext = createContext<ClientUser | null>(null);

export function AuthProvider({
    user,
    children,
}: {
    user: ClientUser | null;
    children: React.ReactNode;
}) {
    useClientAuthSync(user);
    return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

/**
 * Align the client Firebase SDK with the cookie session.
 *
 * The app authenticates by session cookie, and the client SDK does NOT sign in as a
 * side-effect of that. So client-SDK operations (Storage uploads, callable Functions)
 * can run with a missing/stale token whose role & permission claims diverge from the
 * session — e.g. a main_admin getting "Requires 'communications' permission" or
 * `storage/unauthorized`. This effect signs the client SDK in as the session user
 * (via a short-lived custom token minted server-side) and refreshes its claims, so
 * those operations always carry the current role/permissions. Best-effort: on any
 * failure the cookie session still governs the app.
 */
function useClientAuthSync(user: ClientUser | null) {
    const syncedFor = useRef<string | null>(null);
    useEffect(() => {
        if (!user) {
            syncedFor.current = null;
            return;
        }
        if (syncedFor.current === user.uid) return;
        syncedFor.current = user.uid;
        let cancelled = false;
        (async () => {
            try {
                const { ensureClientSignedIn } = await import('@/lib/firebase/client');
                await ensureClientSignedIn({ uid: user.uid, refresh: true });
            } catch {
                // Best-effort; allow a retry on a later mount.
                if (!cancelled) syncedFor.current = null;
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.uid]);
}

/** The signed-in user, or null. Hydrated from the server layout. */
export function useUser(): ClientUser | null {
    return useContext(AuthContext);
}

/** Sign out: clear the session cookie then hard-navigate home. */
export async function signOutEverywhere() {
    const { getClientAuth } = await import('@/lib/firebase/client');
    const { signOut } = await import('firebase/auth');
    try {
        await signOut(getClientAuth());
    } finally {
        await fetch('/api/logout', { method: 'GET' });
        window.location.assign('/');
    }
}
