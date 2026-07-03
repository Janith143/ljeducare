import type { Role } from './roles';
import {
    ALL_PERMISSIONS,
    DEFAULT_ROLE_PERMISSIONS,
    MAIN_ADMIN_ONLY,
    type Permission,
} from './permissions';

/** Shape of the auth claims we set server-side (auth-security function). */
export interface AuthClaims {
    role: Role;
    /** Student business id, e.g. SID0001AB */
    sid?: string;
    /** Teacher/staff business id, e.g. TID0001AB */
    tid?: string;
    /** Delegated permission subset for manager / teacher_admin. Undefined = role default. */
    perms?: Permission[];
}

/**
 * Resolve the effective permission set for a user.
 * - main_admin: always everything (delegation cannot restrict it).
 * - manager / teacher_admin: explicit `perms` claim if present, else role default —
 *   but never permissions reserved for main_admin.
 * - teacher / student / kiosk: none.
 */
export function effectivePermissions(claims: Pick<AuthClaims, 'role' | 'perms'>): Permission[] {
    if (claims.role === 'main_admin') return ALL_PERMISSIONS;
    const base = claims.perms ?? DEFAULT_ROLE_PERMISSIONS[claims.role] ?? [];
    return base.filter((p) => !MAIN_ADMIN_ONLY.includes(p));
}

/** Can this user access the given admin permission key? */
export function can(claims: Pick<AuthClaims, 'role' | 'perms'>, permission: Permission): boolean {
    return effectivePermissions(claims).includes(permission);
}
