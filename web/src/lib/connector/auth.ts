import 'server-only';
import crypto from 'node:crypto';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Shared-secret HMAC auth for the cross-app connector API. The calling hub (clazz.lk) signs
 * each request with `HMAC-SHA256(key, "<timestamp>.<rawBody>")` and sends the timestamp + hex
 * signature as headers. We recompute and compare in constant time, and reject stale timestamps
 * to block replay.
 *
 * KEY SOURCE (in priority order):
 *  1. `settings/connector.hubKey` — pasted by this institute's own admin in the
 *     "clazz.lk Marketplace" settings page. This is what lets a NEW partner be connected with
 *     no code edit and no deploy: the hub derives a per-partner key, the admin pastes it here.
 *  2. `PORTAL_BRIDGE_SECRET` env — the original pairing (kept so existing installs keep working).
 * The key is server-only; it never reaches the browser. Cached briefly so we don't read
 * Firestore on every connector call.
 */
const MAX_SKEW_MS = 5 * 60 * 1000;
const KEY_TTL_MS = 60 * 1000;

export const PORTAL_TS_HEADER = 'x-portal-timestamp';
export const PORTAL_SIG_HEADER = 'x-portal-signature';

let cachedKey: { value: string; at: number } | null = null;

/** Resolve this institute's hub key (admin-pasted first, env fallback). */
export async function getConnectorKey(): Promise<string> {
    const now = Date.now();
    if (cachedKey && now - cachedKey.at < KEY_TTL_MS) return cachedKey.value;

    let value = process.env.PORTAL_BRIDGE_SECRET || '';
    try {
        const snap = await adminDb().collection('settings').doc('connector').get();
        const data = snap.exists ? snap.data() : null;
        if (data && data.enabled !== false && typeof data.hubKey === 'string' && data.hubKey.trim()) {
            value = data.hubKey.trim();
        }
    } catch {
        /* fall back to env — never fail the request because config is unreadable */
    }
    cachedKey = { value, at: now };
    return value;
}

/** Sign a raw body for a given timestamp. Pass an explicit key for outbound calls. */
export function signPortalRequestWith(rawBody: string, timestamp: string, key: string): string {
    return crypto.createHmac('sha256', key).update(`${timestamp}.${rawBody}`).digest('hex');
}

/** Sign using this institute's configured key (outbound server-to-server calls). */
export async function signPortalRequest(rawBody: string, timestamp: string): Promise<string> {
    return signPortalRequestWith(rawBody, timestamp, await getConnectorKey());
}

/** Verify a request's signature over its raw body. Returns false on any mismatch. */
export async function verifySignature(
    rawBody: string,
    timestamp: string | null,
    signature: string | null,
): Promise<boolean> {
    const key = await getConnectorKey();
    if (!key || !timestamp || !signature) return false;
    const ts = Number(timestamp);
    // Clock skew is the #1 self-hosted failure mode — keep the window tight but explicit.
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) return false;
    const expected = signPortalRequestWith(rawBody, timestamp, key);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
