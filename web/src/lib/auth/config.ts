/**
 * next-firebase-auth-edge configuration shared by middleware and server helpers.
 * With emulators (FIREBASE_AUTH_EMULATOR_HOST set) no service account is needed;
 * in production provide FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY.
 */
const useEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
const projectId =
    process.env.GCLOUD_PROJECT ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '';

const serviceAccount = useEmulator
    ? // Emulator mode never signs or fetches tokens — only projectId is read
      // (auth-request-handler uses the literal 'owner' access token). A stub
      // avoids the library falling back to the GCP metadata server locally.
      { projectId, clientEmail: 'emulator@example.com', privateKey: 'emulator' }
    : process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY
      ? {
            projectId,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }
      : undefined;

export const authConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    cookieName: 'AuthToken',
    cookieSignatureKeys: [
        process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT ?? 'dev-insecure-key-current',
        process.env.AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS ?? 'dev-insecure-key-previous',
    ],
    cookieSerializeOptions: {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 12 * 60 * 60 * 24, // 12 days
    },
    serviceAccount,
    enableMultipleCookies: true,
    enableCustomToken: false,
    debug: false,
};

export const AUTH_PATHS = {
    login: '/api/login',
    logout: '/api/logout',
    refresh: '/api/refresh-token',
} as const;
