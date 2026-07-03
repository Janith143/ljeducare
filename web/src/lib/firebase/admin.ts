import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

/**
 * firebase-admin singleton for RSCs and route handlers.
 * Credentials resolution order:
 *  1. FIREBASE_SERVICE_ACCOUNT_KEY env (JSON string) — local/dev
 *  2. GOOGLE_APPLICATION_CREDENTIALS file path — local/dev
 *  3. Application Default Credentials — App Hosting / Cloud Run
 * With emulators, no real credentials are needed (FIRESTORE_EMULATOR_HOST etc. are honored).
 */
function getAdminApp(): App {
    const existing = getApps()[0];
    if (existing) return existing;

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (saKey) {
        return initializeApp({ credential: cert(JSON.parse(saKey)), projectId });
    }
    return initializeApp({ projectId });
}

export function adminAuth(): Auth {
    return getAuth(getAdminApp());
}

export function adminDb(): Firestore {
    return getFirestore(getAdminApp());
}

export function adminStorage(): Storage {
    return getStorage(getAdminApp());
}
