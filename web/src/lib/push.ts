'use client';

/**
 * Web push registration. Requests notification permission, retrieves an FCM
 * token via the messaging service worker, and stores it on the user's doc.
 * Requires NEXT_PUBLIC_FIREBASE_VAPID_KEY — a no-op (returns 'unconfigured')
 * until that key is set, so it's safe to ship before enabling push.
 */
export async function enablePush(uid: string): Promise<'ok' | 'denied' | 'unsupported' | 'unconfigured'> {
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return 'unconfigured';
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
        return 'unsupported';
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) return 'unsupported';

    const { getFirebaseApp, getClientDb } = await import('@/lib/firebase/client');
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(getMessaging(getFirebaseApp()), {
        vapidKey,
        serviceWorkerRegistration: registration,
    });
    if (!token) return 'unsupported';

    const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
    await updateDoc(doc(getClientDb(), 'users', uid), { fcmTokens: arrayUnion(token) });
    return 'ok';
}
