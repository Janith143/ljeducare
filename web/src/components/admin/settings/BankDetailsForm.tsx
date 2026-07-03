'use client';

import { useState, useTransition } from 'react';
import { saveBankDetailsAction, type BankDetailsInput } from '@/app/admin/settings/actions';

/** Institute bank account shown to students on the slip-payment page. */
export default function BankDetailsForm({ initial }: { initial: Partial<BankDetailsInput> }) {
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ ok?: boolean; text: string } | null>(null);

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
            <button type="submit" disabled={pending} className="btn-primary px-4 py-1.5 text-sm">
                {pending ? 'Saving…' : 'Save bank details'}
            </button>
        </form>
    );
}
