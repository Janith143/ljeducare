'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from 'react';
import { saveBankDetailsAction, uploadBankQrAction, type BankDetailsInput } from '@/app/admin/settings/actions';

/** Institute bank account shown to students on the slip-payment page. */
export default function BankDetailsForm({ initial }: { initial: Partial<BankDetailsInput> }) {
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ ok?: boolean; text: string } | null>(null);
    const [qrUrl, setQrUrl] = useState(initial.qrImageUrl ?? '');
    const [uploading, setUploading] = useState(false);

    async function uploadQr(file: File) {
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ text: 'QR image must be under 5 MB.' });
            return;
        }
        setUploading(true);
        setMessage(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await uploadBankQrAction(fd);
            if (res.error) setMessage({ text: res.error });
            else if (res.url) setQrUrl(res.url);
        } catch (e) {
            setMessage({ text: (e as Error)?.message ?? 'Upload failed.' });
        } finally {
            setUploading(false);
        }
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        startTransition(async () => {
            setMessage(null);
            const result = await saveBankDetailsAction({
                bankName: String(f.get('bankName') ?? ''),
                accountName: String(f.get('accountName') ?? ''),
                accountNumber: String(f.get('accountNumber') ?? ''),
                branch: String(f.get('branch') ?? ''),
                instructions: String(f.get('instructions') ?? ''),
                qrImageUrl: qrUrl,
            });
            setMessage(result.error ? { text: result.error } : { ok: true, text: 'Bank details saved.' });
        });
    }

    return (
        <form onSubmit={handleSubmit} className="card space-y-3">
            <h2 className="font-semibold">Bank transfer details</h2>
            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                Shown to students choosing &ldquo;Bank transfer&rdquo; at checkout.
            </p>
            {message && (
                <p role="status" className={`rounded-lg p-2 text-sm ${message.ok ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
                    {message.text}
                </p>
            )}
            <div className="grid grid-cols-2 gap-3">
                <input name="bankName" placeholder="Bank name" defaultValue={initial.bankName} className="input" />
                <input name="branch" placeholder="Branch" defaultValue={initial.branch} className="input" />
            </div>
            <input name="accountName" placeholder="Account holder name" defaultValue={initial.accountName} className="input" />
            <input name="accountNumber" placeholder="Account number" defaultValue={initial.accountNumber} className="input" />
            <textarea name="instructions" rows={2} placeholder="Extra instructions (optional)" defaultValue={initial.instructions} className="input" />

            {/* Payment QR */}
            <div className="rounded-lg border border-light-border p-3 dark:border-dark-border">
                <span className="mb-2 block text-sm font-medium">Payment QR (optional)</span>
                <p className="mb-2 text-xs text-light-subtle dark:text-dark-subtle">
                    Upload the bank/app QR your students scan to pay. Shown beside the account details on the
                    bank-transfer page.
                </p>
                <div className="flex flex-wrap items-start gap-3">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-light-border bg-light-background dark:border-dark-border dark:bg-dark-background">
                        {qrUrl ? (
                            <img src={qrUrl} alt="Payment QR" className="h-full w-full object-contain" />
                        ) : (
                            <span className="px-2 text-center text-xs text-light-subtle dark:text-dark-subtle">No QR</span>
                        )}
                    </div>
                    <div className="min-w-[12rem] flex-1 space-y-2">
                        <input
                            type="file"
                            accept="image/*"
                            disabled={uploading}
                            className="block w-full text-xs"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadQr(file);
                            }}
                        />
                        {uploading && <span className="text-xs text-light-subtle">Uploading…</span>}
                        {qrUrl && !uploading && (
                            <button type="button" onClick={() => setQrUrl('')} className="text-xs font-medium text-red-600 hover:underline">
                                Remove QR
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <button type="submit" disabled={pending || uploading} className="btn-primary px-4 py-1.5 text-sm">
                {pending ? 'Saving…' : 'Save bank details'}
            </button>
        </form>
    );
}
