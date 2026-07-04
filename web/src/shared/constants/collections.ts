/**
 * Firestore collection names — single source of truth for web, functions, rules and scripts.
 * New project uses the (default) database (no databaseId anywhere).
 */
export const COLLECTIONS = {
    USERS: 'users',
    STAFF: 'staff',                          // replaces teachers/managed_teachers/tuitionInstitutes
    CLASSES: 'classes',
    COURSES: 'courses',
    QUIZZES: 'quizzes',
    SALES: 'sales',                          // server-only writes
    ORDERS: 'orders',                        // cart checkout — server-only writes
    CATEGORIES: 'categories',                // browse categories (admin-managed)
    FINANCIAL_LEDGER: 'financial_ledger',    // server-only writes
    TEACHER_PAYMENTS: 'teacher_payments',    // Pay & Reset settlement log, server-only writes
    SUBMISSIONS: 'submissions',              // quiz submissions
    CERTIFICATES: 'certificates',
    ATTENDANCE: 'attendance',                // per-class-session attendance records
    NOTIFICATIONS: 'notifications',
    CUSTOM_CLASS_REQUESTS: 'customClassRequests',
    ACTIVITY_LOGS: 'activity_logs',
    LOGIN_EVENTS: 'loginEvents',
    SETTINGS: 'settings',
    KIOSK_DEVICES: 'kiosk_devices',
} as const;

/** settings/* document ids */
export const SETTINGS_DOCS = {
    CURRENCIES: 'currencies',
    GATEWAYS: 'gateways',
    SITE: 'site',
    KIOSK: 'kiosk',
    HOMEPAGE: 'homepage',
} as const;

/** Storage path roots (mirrors storage.rules). */
export const STORAGE_PATHS = {
    PAYMENT_SLIPS: 'payment-slips',
    PROFILE_IMAGES: 'profile-images',
    COVER_IMAGES: 'cover-images',
    CERTIFICATES: 'certificates',
    SITE_ASSETS: 'site-assets',
    CATEGORY_IMAGES: 'category-images',
} as const;
