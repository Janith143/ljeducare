/** Site-wide constants sourced from env (placeholder-safe until the Firebase project exists). */
export const SITE = {
    name: process.env.NEXT_PUBLIC_SITE_NAME ?? 'LJ Educare',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    defaultCurrency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? 'LKR',
    description:
        'LJ Educare — online and physical classes, recorded courses, quizzes and exams for our students.',
} as const;

/**
 * Where the marketing landing page lives — the site home.
 * Backed by `src/app/(landing)/page.tsx`.
 */
export const LANDING_PATH = '/';

/**
 * The LMS itself: the subject/teacher directory that used to be the home page.
 * Backed by `src/app/(public)/portal/page.tsx`, and what the landing nav's
 * "Visit LMS" button points at by default.
 *
 * These two constants must match the route folders — Next routing is file-based,
 * so changing a path means moving the page as well. Only one of them can be '/'.
 */
export const PORTAL_PATH = '/portal';
