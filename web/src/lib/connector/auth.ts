import 'server-only';
import crypto from 'node:crypto';

/**
 * Shared-secret HMAC auth for the cross-app connector API. The calling hub
 * (studentportal) signs each request with `HMAC-SHA256(secret, "<timestamp>.<rawBody>")`
 * and sends the timestamp + hex signature as headers. We recompute and compare in
 * constant time, and reject stale timestamps to block replay. The secret
 * (PORTAL_BRIDGE_SECRET) lives only in server env on both sides — never the browser.
 */
const MAX_SKEW_MS = 5 * 60 * 1000;

export const PORTAL_TS_HEADER = 'x-portal-timestamp';
export const PORTAL_SIG_HEADER = 'x-portal-signature';

function secret(): string {
    return process.env.PORTAL_BRIDGE_SECRET || '';
}

/** Sign a raw body for a given timestamp (also used by tests / the caller side). */
export function signPortalRequest(rawBody: string, timestamp: string, key = secret()): string {
    return crypto.createHmac('sha256', key).update(`${timestamp}.${rawBody}`).digest('hex');
}

/** Verify a request's signature over its raw body. Returns false on any mismatch. */
export function verifySignature(
    rawBody: string,
    timestamp: string | null,
    signature: string | null,
): boolean {
    const key = secret();
    if (!key || !timestamp || !signature) return false;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) return false;
    const expected = signPortalRequest(rawBody, timestamp, key);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
