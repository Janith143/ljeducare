/** The six platform roles. Set ONLY server-side (auth-security function) as custom claims. */
export type Role =
    | 'main_admin'
    | 'manager'
    | 'teacher_admin'
    | 'teacher'
    | 'student'
    | 'kiosk';

export const ALL_ROLES: Role[] = [
    'main_admin',
    'manager',
    'teacher_admin',
    'teacher',
    'student',
    'kiosk',
];

/** Roles allowed into the /admin area at all. */
export const ADMIN_AREA_ROLES: Role[] = ['main_admin', 'manager', 'teacher_admin'];

/**
 * Roles allowed into the /teacher area.
 *
 * Includes main_admin/manager: they author and manage classes and courses there on
 * behalf of teachers (see lib/auth/contentRoles.ts). This list drives the MIDDLEWARE
 * gate, which runs before any page renders — leaving them out silently bounced an
 * admin clicking "New class" back to /admin even though the page itself allowed them.
 */
export const TEACHER_AREA_ROLES: Role[] = ['teacher', 'teacher_admin', 'main_admin', 'manager'];

/**
 * Roles that own a `staff` profile: they may be assigned as the teacher of a class or
 * course, they earn a commission on its sales, and they get the personal teaching pages
 * (own profile, earnings, students, attendance, messaging).
 *
 * Managers and teacher admins teach alongside their admin duties, so they belong here —
 * without a staff profile there is nothing to attach a commission rate or earnings to.
 * main_admin is deliberately excluded: the platform owner is not a revenue-sharing
 * teacher. If they also teach, give them a separate teaching account.
 */
export const TEACHING_ROLES: Role[] = ['teacher', 'teacher_admin', 'manager'];

/** Does this role own a staff profile (and therefore a commission rate)? */
export function isTeachingRole(role: unknown): boolean {
    return typeof role === 'string' && (TEACHING_ROLES as string[]).includes(role);
}

export function isRole(value: unknown): value is Role {
    return typeof value === 'string' && (ALL_ROLES as string[]).includes(value);
}
