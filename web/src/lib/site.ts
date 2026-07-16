/** Site-wide constants sourced from env (placeholder-safe until the Firebase project exists). */
export const SITE = {
    name: process.env.NEXT_PUBLIC_SITE_NAME ?? 'LJ Educare',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    defaultCurrency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? 'LKR',
    description:
        'LJ Educare — online and physical classes, recorded courses, quizzes and exams for our students.',
} as const;

/**
 * Where the marketing landing page lives.
 *
 * It is deliberately NOT `/` — `/` stays the existing subject/teacher directory that
 * ljeducare.com serves today. To make the landing page the site home instead:
 *   1. move `src/app/(landing)/landing/page.tsx` up to `src/app/(landing)/page.tsx`,
 *   2. move the current `src/app/(public)/page.tsx` somewhere else (e.g. `portal/`),
 *      since two route groups can't both own `/`,
 *   3. set this to '/'.
 * Everything else (nav/footer logo links, admin "View page", revalidation) follows
 * this constant.
 */
export const LANDING_PATH = '/landing';
