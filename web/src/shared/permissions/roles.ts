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

/** Roles allowed into the /teacher area. */
export const TEACHER_AREA_ROLES: Role[] = ['teacher', 'teacher_admin'];

export function isRole(value: unknown): value is Role {
    return typeof value === 'string' && (ALL_ROLES as string[]).includes(value);
}
