'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { callFunction } from '@/lib/firebase/client';

/** Upload one bank slip for a whole cart order → attachOrderSlip (all sales). */
export default function OrderSlipUpload({ orderId }: { orderId: string }) {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleUpload() {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }
        setBusy(true); setError(null);
        try {
            const { getClientStorage } = await import('@/lib/firebase/client');
            const { getDownloadURL, ref, uploadBytes } = await import('firebase/storage');
            const path = `payment-slips/order-${orderId}-${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
            const storageRef = ref(getClientStorage(), path);
            await uploadBytes(storageRef, file, { contentType: file.type });
            const slipImageUrl = await getDownloadURL(storageRef);
            await callFunction<{ orderId: string; slipImageUrl: string }, { success: boolean }>('attachOrderSlip', { orderId, slipImageUrl });
            router.refresh();
        } catch (e: unknown) {
            setError((e as Error)?.message ?? 'Upload failed — please try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="card space-y-3 text-left">
            <h2 className="font-semibold">Upload your payment slip</h2>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Transfer the total to the institute bank account, then upload one slip covering the whole order.
            </p>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="input" />
            <button type="button" onClick={handleUpload} disabled={!file || busy} className="btn-primary w-full">
                {busy ? 'Uploading…' : 'Submit slip for approval'}
            </button>
        </section>
    );
}
