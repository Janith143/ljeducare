'use client';

import { createContext, useContext } from 'react';
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
    return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
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
