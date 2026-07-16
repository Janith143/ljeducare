import 'server-only';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Minimal fixed-window rate limiter, keyed per caller (studentId, IP, …).
 * Stored in {collection}/{key} (server-only).
 * Fails open on limiter errors so a transient Firestore hiccup can't lock callers out.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export async function checkRateLimit(
    key: string,
    opts: { collection?: string; windowMs?: number; maxAttempts?: number } = {},
): Promise<boolean> {
    const {
        collection = 'connector_rate_limits',
        windowMs = WINDOW_MS,
        maxAttempts = MAX_ATTEMPTS,
    } = opts;
    const ref = adminDb().collection(collection).doc(key);
    const now = Date.now();
    try {
        const snap = await ref.get();
        const attempts: number[] = (snap.data()?.attempts ?? []).filter(
            (t: number) => typeof t === 'number' && now - t < windowMs,
        );
        if (attempts.length >= maxAttempts) return false;
        attempts.push(now);
        await ref.set({ attempts }, { merge: true });
        return true;
    } catch {
        return true;
    }
}
