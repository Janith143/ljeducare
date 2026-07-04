import 'server-only';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Minimal fixed-window rate limiter for the connector's credential endpoint,
 * keyed per studentId. Stored in connector_rate_limits/{key} (server-only).
 * Fails open on limiter errors so a transient Firestore hiccup can't lock linking out.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export async function checkRateLimit(key: string): Promise<boolean> {
    const ref = adminDb().collection('connector_rate_limits').doc(key);
    const now = Date.now();
    try {
        const snap = await ref.get();
        const attempts: number[] = (snap.data()?.attempts ?? []).filter(
            (t: number) => typeof t === 'number' && now - t < WINDOW_MS,
        );
        if (attempts.length >= MAX_ATTEMPTS) return false;
        attempts.push(now);
        await ref.set({ attempts }, { merge: true });
        return true;
    } catch {
        return true;
    }
}
