'use server';

import { getUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { savePaymentSlipImage } from '@/lib/data/slipUpload';

/**
 * Upload a bank-transfer slip for a single pending_slip sale and attach it.
 * Runs server-side (Admin SDK + cookie auth) so it never depends on the client
 * Firebase SDK being signed in. Replaces the old client Storage upload +
 * attachPaymentSlip callable.
 */
export async function uploadPaymentSlipAction(formData: FormData): Promise<{ ok?: true; error?: string }> {
    const user = await getUser();
    if (!user) return { error: 'Please sign in again and retry.' };

    const saleId = String(formData.get('saleId') ?? '');
    const file = formData.get('file');
    if (!saleId) return { error: 'Missing sale reference.' };
    if (!(file instanceof File)) return { error: 'No file provided.' };

    const ref = adminDb().collection('sales').doc(saleId);
    const snap = await ref.get();
    if (!snap.exists) return { error: 'Sale not found.' };
    const sale = snap.data() as { studentId?: string; status?: string };
    if (sale.studentId !== user.uid) return { error: 'This payment is not on your account.' };
    if (sale.status !== 'pending_slip') return { error: `This payment is not awaiting a slip (${sale.status}).` };

    try {
        const slipImageUrl = await savePaymentSlipImage(file, saleId);
        await ref.update({ slipImageUrl, slipUploadedAt: new Date().toISOString() });
        return { ok: true };
    } catch (e) {
        return { error: (e as Error)?.message ?? 'Upload failed — please try again.' };
    }
}
