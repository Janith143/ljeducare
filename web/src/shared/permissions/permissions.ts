import type { Role } from './roles';

/**
 * Admin-area permission keys. One per /admin/* route section.
 * Mirrors the source hybridLMS AdminView delegation pattern (types/ui.ts),
 * trimmed to the private-institute feature set.
 */
export type Permission =
    | 'analytics'
    | 'users'
    | 'staff'            // create/edit staff, roles, commission % — sensitive
    | 'content'          // course/class approval queue
    | 'landing_page'     // public marketing landing page CMS + its contact inbox
    | 'classes'
    | 'courses'
    | 'sales'
    | 'revenue'          // institute income, teacher balances, Pay & Reset
    | 'attendance'
    | 'requests'         // bank-slip approvals, custom class requests
    | 'students'         // student lookup by mobile
    | 'exams'
    | 'certificates'
    | 'communications'   // bulk announcements to students (in-app/email/SMS/push)
    | 'settings'         // currencies/rates, gateways, integrations, kiosk devices
    | 'activity_logs'
    | 'data_privacy'
    | 'recycle_bin';

export const ALL_PERMISSIONS: Permission[] = [
    'analytics',
    'users',
    'staff',
    'content',
    'landing_page',
    'classes',
    'courses',
    'sales',
    'revenue',
    'attendance',
    'requests',
    'students',
    'exams',
    'certificates',
    'communications',
    'settings',
    'activity_logs',
    'data_privacy',
    'recycle_bin',
];

/** Default permission sets per role. `main_admin` always has everything. */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    main_admin: ALL_PERMISSIONS,
    manager: [
        'analytics',
        'users',
        'content',
        'landing_page',
        'classes',
        'courses',
        'sales',
        'revenue',
        'attendance',
        'requests',
        'students',
        'exams',
        'certificates',
        'communications',
        'activity_logs',
        'recycle_bin',
    ],
    teacher_admin: [
        'staff',
        'content',
        'classes',
        'courses',
        'attendance',
        'exams',
        'recycle_bin',
    ],
    teacher: [],
    student: [],
    kiosk: [],
};

/** Permissions that only main_admin may ever hold, even via delegation. */
export const MAIN_ADMIN_ONLY: Permission[] = ['settings', 'data_privacy'];
