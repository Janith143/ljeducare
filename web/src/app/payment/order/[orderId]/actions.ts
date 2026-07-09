'use server';

import { getUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { savePaymentSlipImage } from '@/lib/data/slipUpload';

/**
 * Upload ONE bank-transfer slip for a whole cart order and attach it to every
 * pending sale in the order. Server-side (Admin SDK + cookie auth); replaces the
 * old client Storage upload + attachOrderSlip callable.
 */
export async function uploadOrderSlipAction(formData: FormData): Promise<{ ok?: true; error?: string }> {
    const user = await getUser();
    if (!user) return { error: 'Please sign in again and retry.' };

    const orderId = String(formData.get('orderId') ?? '');
    const file = formData.get('file');
    if (!orderId) return { error: 'Missing order reference.' };
    if (!(file instanceof File)) return { error: 'No file provided.' };

    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return { error: 'Order not found.' };
    const order = orderSnap.data() as { studentId?: string; saleIds?: string[] };
    if (order.studentId !== user.uid) return { error: 'This order is not on your account.' };

    try {
        const slipImageUrl = await savePaymentSlipImage(file, `order-${orderId}`);
        const now = new Date().toISOString();
        const batch = db.batch();
        for (const sid of order.saleIds ?? []) {
            batch.update(db.collection('sales').doc(String(sid)), { slipImageUrl, slipUploadedAt: now });
        }
        batch.update(orderRef, { slipImageUrl, slipUploadedAt: now });
        await batch.commit();
        return { ok: true };
    } catch (e) {
        return { error: (e as Error)?.message ?? 'Upload failed — please try again.' };
    }
}
