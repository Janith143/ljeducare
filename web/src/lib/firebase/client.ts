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

export function getFirebaseApp(): FirebaseApp {
    return getApps()[0] ?? initializeApp(firebaseConfig);
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

/** Invoke a callable Cloud Function by name (region asia-south1). */
export async function callFunction<TReq, TRes>(name: string, data: TReq): Promise<TRes> {
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
