import 'server-only';

import { randomUUID } from 'node:crypto';
import { adminStorage } from '@/lib/firebase/admin';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Save a bank-transfer slip image to Storage via the Admin SDK and return a
 * tokenized download URL. Admin SDK bypasses Storage rules, so this works from a
 * cookie-authenticated server action without the client Firebase SDK being signed
 * in — the durable fix for the recurring payment-slips `storage/unauthorized`.
 */
export async function savePaymentSlipImage(file: File, keyPrefix: string): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
    if (file.size > MAX_BYTES) throw new Error('Image must be under 5 MB.');

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) throw new Error('Storage bucket is not configured.');

    const token = randomUUID();
    const safeName = file.name.replace(/[^\w.-]/g, '_');
    const path = `payment-slips/${keyPrefix}-${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await adminStorage()
        .bucket(bucketName)
        .file(path)
        .save(buffer, {
            metadata: { contentType: file.type, metadata: { firebaseStorageDownloadTokens: token } },
        });

    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}
