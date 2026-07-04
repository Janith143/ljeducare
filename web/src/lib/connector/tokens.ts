import 'server-only';
import crypto from 'node:crypto';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Link tokens — long-lived, revocable, opaque handles the hub stores after a student
 * proves they own this LMS account. The hub presents the token to /summary to re-fetch
 * content later WITHOUT re-collecting the password. Stored server-only in accountLinks/{token}
 * (Firestore rules deny all client access).
 */
const COLLECTION = 'accountLinks';

export interface LinkRecord {
    uid: string;
    studentId: string;
}

export async function mintLinkToken(uid: string, studentId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await adminDb().collection(COLLECTION).doc(token).set({
        uid,
        studentId,
        revoked: false,
        createdAt: new Date().toISOString(),
    });
    return token;
}

export async function resolveLinkToken(token: string): Promise<LinkRecord | null> {
    if (!token) return null;
    const snap = await adminDb().collection(COLLECTION).doc(token).get();
    const data = snap.data();
    if (!data || data.revoked) return null;
    return { uid: String(data.uid), studentId: String(data.studentId) };
}

export async function revokeLinkToken(token: string): Promise<void> {
    if (!token) return;
    await adminDb()
        .collection(COLLECTION)
        .doc(token)
        .set({ revoked: true, revokedAt: new Date().toISOString() }, { merge: true });
}
