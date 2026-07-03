/** Site-wide constants sourced from env (placeholder-safe until the Firebase project exists). */
export const SITE = {
    name: process.env.NEXT_PUBLIC_SITE_NAME ?? 'LJ Educare',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    defaultCurrency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? 'LKR',
    description:
        'LJ Educare — online and physical classes, recorded courses, quizzes and exams for our students.',
} as const;
