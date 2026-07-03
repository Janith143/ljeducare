'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@ljeducare/shared';
import { callFunction } from '@/lib/firebase/client';

export interface PendingSlip {
    id: string;
    itemName: string;
    amount: number;
    currency: string;
    saleDate: string;
    slipImageUrl: string | null;
    studentName: string;
    studentContact: string;
}

export default function SlipApprovalTable({ pending }: { pending: PendingSlip[] }) {
    if (!pending.length) {
        return <p className="card text-sm text-light-subtle dark:text-dark-subtle">No pending slip payments. 🎉</p>;
    }
    return (
        <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-light-border text-left dark:border-dark-border">
                        <th className="p-3">Date</th>
                        <th className="p-3">Student</th>
                        <th className="p-3">Item</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Slip</th>
                        <th className="p-3" />
                    </tr>
                </thead>
                <tbody>
                    {pending.map((sale) => (
                        <Row key={sale.id} sale={sale} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Row({ sale }: { sale: PendingSlip }) {
    const router = useRouter();
    const [pendingTx, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function act(action: 'approve' | 'reject') {
        const reason = action === 'reject' ? window.prompt('Reason for rejection?') ?? 'Slip rejected' : undefined;
        startTransition(async () => {
            setError(null);
            try {
                if (action === 'approve') {
                    await callFunction('approveSlipSale', { saleId: sale.id, confirmedAmount: sale.amount });
                } else {
                    await callFunction('rejectSlipSale', { saleId: sale.id, reason });
                }
                router.refresh();
            } catch (e: unknown) {
                setError((e as Error)?.message ?? 'Action failed');
            }
        });
    }

    return (
        <tr className="border-b border-light-border align-top dark:border-dark-border">
            <td className="p-3 whitespace-nowrap">{sale.saleDate.slice(0, 10)}</td>
            <td className="p-3">
                <span className="block font-medium">{sale.studentName}</span>
                <span className="text-xs text-light-subtle dark:text-dark-subtle">{sale.studentContact}</span>
            </td>
            <td className="p-3">{sale.itemName}</td>
            <td className="p-3 font-medium whitespace-nowrap">
                {formatCurrency({ amount: sale.amount, currency: sale.currency })}
            </td>
            <td className="p-3">
                {sale.slipImageUrl ? (
                    <a href={sale.slipImageUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        View slip ↗
                    </a>
                ) : (
                    <span className="text-xs text-light-subtle dark:text-dark-subtle">Not uploaded yet</span>
                )}
            </td>
            <td className="space-x-2 p-3 text-right whitespace-nowrap">
                {error && <span className="block text-xs text-red-600">{error}</span>}
                <button
                    type="button"
                    disabled={pendingTx || !sale.slipImageUrl}
                    onClick={() => act('approve')}
                    className="btn-primary px-3 py-1 text-xs"
                >
                    Approve
                </button>
                <button type="button" disabled={pendingTx} onClick={() => act('reject')} className="btn-secondary px-3 py-1 text-xs">
                    Reject
                </button>
            </td>
        </tr>
    );
}
