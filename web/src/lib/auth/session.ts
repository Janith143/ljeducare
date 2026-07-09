import 'server-only';

import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getTokens } from 'next-firebase-auth-edge';
import type { Permission, Role } from '@ljeducare/shared';
import { can, effectivePermissions, isRole } from '@ljeducare/shared';
import { authConfig } from './config';

export interface SessionUser {
    uid: string;
    email: string | null;
    name: string | null;
    role: Role;
    sid?: string;
    tid?: string;
    perms: Permission[];
}

/** Decode the session cookie in an RSC/route handler. Null when signed out. */
export async function getUser(): Promise<SessionUser | null> {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) return null;
    const { decodedToken } = tokens;
    const role = isRole(decodedToken.role) ? decodedToken.role : null;
    if (!role) return null;

    const claims = {
        role,
        perms: Array.isArray(decodedToken.perms) ? (decodedToken.perms as Permission[]) : undefined,
    };
    return {
        uid: decodedToken.uid,
        email: decodedToken.email ?? null,
        name: (decodedToken.name as string | undefined) ?? null,
        role,
        sid: (decodedToken.sid as string | undefined) ?? undefined,
        tid: (decodedToken.tid as string | undefined) ?? undefined,
        perms: effectivePermissions(claims),
    };
}

/**
 * The Firebase custom token minted alongside the session cookie
 * (enableCustomToken). Used client-side to keep the Auth SDK signed in so
 * callable Cloud Functions receive an ID token. Null when signed out or when
 * the current cookie predates enableCustomToken (refreshes on next login).
 */
export async function getSessionCustomToken(): Promise<string | null> {
    const tokens = await getTokens(await cookies(), authConfig);
    return tokens?.customToken ?? null;
}

/** Require a signed-in user with one of the given roles, else redirect to /login. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
    const user = await getUser();
    if (!user) redirect('/login');
    if (roles.length && !roles.includes(user.role)) notFound();
    return user;
}

/** Require an admin-area user holding a specific permission, else 404. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
    const user = await getUser();
    if (!user) redirect('/login');
    if (!can({ role: user.role, perms: user.perms }, permission)) notFound();
    return user;
}
