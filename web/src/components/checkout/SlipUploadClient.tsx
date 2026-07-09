'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { callFunction } from '@/lib/firebase/client';

/** Upload the transfer slip to Storage, then attach it to the sale. */
export default function SlipUploadClient({ saleId }: { saleId: string }) {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleUpload() {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be under 5 MB.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const { ensureClientSignedIn, getClientStorage } = await import('@/lib/firebase/client');
            const { getDownloadURL, ref, uploadBytes } = await import('firebase/storage');

            // The Storage upload needs the client SDK authed (payment-slips rule = isAuthed());
            // the app authenticates by cookie, so align the client SDK to the session first.
            await ensureClientSignedIn();

            const path = `payment-slips/${saleId}-${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
            const storageRef = ref(getClientStorage(), path);
            await uploadBytes(storageRef, file, { contentType: file.type });
            const slipImageUrl = await getDownloadURL(storageRef);

            await callFunction<{ saleId: string; slipImageUrl: string }, { success: boolean }>(
                'attachPaymentSlip',
                { saleId, slipImageUrl },
            );
            router.push(`/payment/success/${saleId}`);
        } catch (e: unknown) {
            setError((e as Error)?.message ?? 'Upload failed — please try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="card space-y-3">
            <h2 className="font-semibold">Upload your payment slip</h2>
            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}
            <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="input"
            />
            <button type="button" onClick={handleUpload} disabled={!file || busy} className="btn-primary w-full">
                {busy ? 'Uploading…' : 'Submit slip for approval'}
            </button>
            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                The institute verifies slips during office hours — you&apos;ll get access as soon as
                it&apos;s approved.
            </p>
        </section>
    );
}
