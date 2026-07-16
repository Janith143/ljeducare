import type { Role } from '@ljeducare/shared';
import { ADMIN_AREA_ROLES, TEACHER_AREA_ROLES } from '@ljeducare/shared';

/** Where each role lands after login. */
export function roleHomePath(role: Role | undefined): string {
    switch (role) {
        case 'main_admin':
        case 'manager':
            return '/admin';
        case 'teacher_admin':
        case 'teacher':
            return '/teacher';
        case 'kiosk':
            return '/kiosk';
        case 'student':
            return '/student';
        default:
            return '/';
    }
}

/**
 * Sanitize a `?next=` login redirect target. Returns null when it should be ignored.
 *
 * Rejects:
 * - anything not starting with '/' — only same-origin paths are ever followed;
 * - '//evil.com' and '/\evil.com' — these LOOK like paths but are protocol-relative,
 *   so navigating to them leaves the site entirely (open redirect);
 * - the kiosk area — a paired scanner is a device destination, never where a human
 *   should land after signing in. main_admin is allowed into /kiosk, so without this
 *   an admin who once opened /kiosk keeps getting sent back there by the stale
 *   `?next=/kiosk` their browser remembers.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
    if (!raw || !raw.startsWith('/')) return null;
    if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
    if (raw === '/kiosk' || raw.startsWith('/kiosk/') || raw.startsWith('/kiosk?')) return null;
    return raw;
}

/** Area prefix → roles allowed in. Used by middleware for coarse gating. */
export const AREA_ROLE_MAP: { prefix: string; roles: Role[] }[] = [
    { prefix: '/admin', roles: ADMIN_AREA_ROLES },
    { prefix: '/teacher', roles: TEACHER_AREA_ROLES },
    { prefix: '/student', roles: ['student'] },
    { prefix: '/kiosk', roles: ['kiosk', 'main_admin'] },
    { prefix: '/checkout', roles: ['student'] },
    { prefix: '/watch', roles: ['student', 'teacher', 'teacher_admin', 'main_admin', 'manager'] },
    { prefix: '/quiz', roles: ['student'] },
];

/** The area a path belongs to, or null when public. */
// Note: device pairing lives at /kiosk-pair (outside /kiosk) so signed-out
// kiosks can reach it — it is intentionally NOT in this map or the matcher.
export function requiredRolesFor(pathname: string): Role[] | null {
    const hit = AREA_ROLE_MAP.find(
        (a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`),
    );
    return hit ? hit.roles : null;
}
