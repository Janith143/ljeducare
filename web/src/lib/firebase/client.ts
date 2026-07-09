'use client';

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import {
    connectFunctionsEmulator,
    getFunctions,
    httpsCallable,
    type Functions,
} from 'firebase/functions';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

const FUNCTIONS_REGION = 'asia-south1';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulators = !!process.env.NEXT_PUBLIC_USE_EMULATORS;
let emulatorsConnected = false;
let appCheckStarted = false;

/**
 * Firebase App Check (reCAPTCHA v3) — bot/abuse protection for Auth, Firestore,
 * Storage and callable Functions. Activates only when a site key is configured
 * (NEXT_PUBLIC_RECAPTCHA_SITE_KEY) and not under emulators, so it's a safe no-op
 * until you register App Check in the console.
 */
async function ensureAppCheck(app: FirebaseApp) {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (appCheckStarted || useEmulators || !siteKey || typeof window === 'undefined') return;
    appCheckStarted = true;
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
    initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
    });
}

export function getFirebaseApp(): FirebaseApp {
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    void ensureAppCheck(app);
    return app;
}

export function getClientAuth(): Auth {
    const auth = getAuth(getFirebaseApp());
    connectEmulators();
    return auth;
}

export function getClientDb(): Firestore {
    const db = getFirestore(getFirebaseApp());
    connectEmulators();
    return db;
}

export function getClientStorage(): FirebaseStorage {
    const storage = getStorage(getFirebaseApp());
    connectEmulators();
    return storage;
}

export function getClientFunctions(): Functions {
    const functions = getFunctions(getFirebaseApp(), FUNCTIONS_REGION);
    connectEmulators();
    return functions;
}

/**
 * Align the client Firebase SDK with the cookie session.
 *
 * The app authenticates by session cookie; the client SDK does NOT sign in as a
 * side-effect. So client-SDK operations (Storage uploads, callable Functions) can run
 * unauthenticated or with a stale token whose role/permission claims diverge from the
 * session. This signs the client SDK in as the session user via a short-lived custom
 * token minted at /api/auth/client-token. Pass `uid` to enforce the expected identity
 * and `refresh: true` to force a claims refresh when already signed in as that user.
 * Best-effort: on any failure the cookie session still governs the app.
 */
let signInInFlight: Promise<void> | null = null;

export function ensureClientSignedIn(opts?: { uid?: string; refresh?: boolean }): Promise<void> {
    // Dedupe concurrent callers (SessionGuard + AuthProvider + a callable can all fire
    // on first load) so the client SDK signs in exactly once.
    if (signInInFlight) return signInInFlight;
    signInInFlight = doEnsureClientSignedIn(opts).finally(() => {
        signInInFlight = null;
    });
    return signInInFlight;
}

async function doEnsureClientSignedIn(opts?: { uid?: string; refresh?: boolean }): Promise<void> {
    const { uid, refresh } = opts ?? {};
    const auth = getClientAuth();
    await auth.authStateReady();
    const cur = auth.currentUser;
    if (cur && (!uid || cur.uid === uid)) {
        if (refresh) {
            try {
                await cur.getIdToken(true);
            } catch {
                /* keep going */
            }
        }
        return;
    }
    const res = await fetch('/api/auth/client-token');
    if (!res.ok) return;
    const { token } = (await res.json()) as { token?: string };
    if (!token) return;
    const { signInWithCustomToken } = await import('firebase/auth');
    await signInWithCustomToken(auth, token);
}

/** Invoke a callable Cloud Function by name (region asia-south1). */
export async function callFunction<TReq, TRes>(name: string, data: TReq): Promise<TRes> {
    await ensureClientSignedIn();
    const fn = httpsCallable<TReq, TRes>(getClientFunctions(), name);
    const result = await fn(data);
    return result.data;
}

function connectEmulators() {
    if (!useEmulators || emulatorsConnected || typeof window === 'undefined') return;
    emulatorsConnected = true;
    const app = getFirebaseApp();
    connectAuthEmulator(getAuth(app), 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(getFirestore(app), '127.0.0.1', 8080);
    connectStorageEmulator(getStorage(app), '127.0.0.1', 9199);
    connectFunctionsEmulator(getFunctions(app, FUNCTIONS_REGION), '127.0.0.1', 5001);
}
