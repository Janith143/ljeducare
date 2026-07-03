/**
 * Role/permission constants — mirrored from packages/shared/src/permissions
 * (functions stay dependency-free of the workspace so `firebase deploy` needs no bundling).
 * Keep in sync when editing either side.
 */
const ROLES = ['main_admin', 'manager', 'teacher_admin', 'teacher', 'student', 'kiosk'];

const ALL_PERMISSIONS = [
    'analytics', 'users', 'staff', 'content', 'classes', 'courses', 'sales',
    'revenue', 'attendance', 'requests', 'students', 'exams', 'certificates',
    'settings', 'activity_logs', 'data_privacy', 'recycle_bin',
];

/** Permissions only main_admin may hold, even via delegation. */
const MAIN_ADMIN_ONLY = ['settings', 'data_privacy'];

function isValidRole(role) {
    return ROLES.includes(role);
}

/** Strip invalid/forbidden permission keys from a delegated perms array. */
function sanitizePerms(perms, role) {
    if (!Array.isArray(perms)) return null;
    if (role !== 'manager' && role !== 'teacher_admin') return null;
    const clean = perms.filter((p) => ALL_PERMISSIONS.includes(p) && !MAIN_ADMIN_ONLY.includes(p));
    return clean.length ? clean : null;
}

module.exports = { ROLES, ALL_PERMISSIONS, MAIN_ADMIN_ONLY, isValidRole, sanitizePerms };
