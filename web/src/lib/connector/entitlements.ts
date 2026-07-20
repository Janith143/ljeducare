import 'server-only';
import crypto from 'node:crypto';
import { adminDb } from '@/lib/firebase/admin';

/**
 * External marketplace entitlements — the delivery counterpart to accountLinks (tokens.ts).
 * When a partner hub (e.g. clazz.lk) SELLS one of our items, it registers the purchase here
 * via /enroll and gets an opaque `entitlementToken`. It presents that token to /content to
 * fetch per-buyer delivery handles (Zoom join, lesson videos) WITHOUT the buyer ever being a
 * user on this LMS. The only thing stored is a pseudonymous `buyerRef` (the hub's hash) — no
 * PII. Server-only; Firestore rules deny all client access to externalEntitlements/.
 */
const COLLECTION = 'externalEntitlements';

export interface Entitlement {
    buyerRef: string;
    providerItemId: string;
    itemType: 'class' | 'course';
}

/** Record (or reuse) an entitlement for a buyer+item. Idempotent — one active token per pair. */
export async function mintEntitlement(buyerRef: string, providerItemId: string, itemType: 'class' | 'course'): Promise<string> {
    const existing = await adminDb().collection(COLLECTION)
        .where('buyerRef', '==', buyerRef)
        .where('providerItemId', '==', providerItemId)
        .where('itemType', '==', itemType)
        .where('revoked', '==', false)
        .limit(1).get();
    if (!existing.empty) return existing.docs[0].id;

    const token = crypto.randomBytes(32).toString('hex');
    await adminDb().collection(COLLECTION).doc(token).set({
        buyerRef, providerItemId, itemType, revoked: false, createdAt: new Date().toISOString(),
    });
    return token;
}

export async function resolveEntitlement(token: string): Promise<Entitlement | null> {
    if (!token) return null;
    const snap = await adminDb().collection(COLLECTION).doc(token).get();
    const d = snap.data();
    if (!d || d.revoked) return null;
    return { buyerRef: String(d.buyerRef), providerItemId: String(d.providerItemId), itemType: d.itemType === 'course' ? 'course' : 'class' };
}

/** Revoke on refund/unenroll — /content then denies delivery. */
export async function revokeEntitlement(token: string): Promise<void> {
    if (!token) return;
    await adminDb().collection(COLLECTION).doc(token).set({ revoked: true, revokedAt: new Date().toISOString() }, { merge: true });
}
