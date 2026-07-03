'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { callFunction } from '@/lib/firebase/client';

/** "Pay & Reset" — settles everything owed to one teacher via the payTeacher callable. */
export default function PayTeacherButton({
    staffId,
    teacherName,
    totalOwed,
}: {
    staffId: string;
    teacherName: string;
    totalOwed: number;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function handlePay() {
        const note = window.prompt(
            `Record a payment of LKR ${totalOwed.toLocaleString()} to ${teacherName}?\nOptional note:`,
        );
        if (note === null) return; // canceled
        startTransition(async () => {
            setError(null);
            try {
                await callFunction('payTeacher', { staffId, note: note || undefined });
                router.refresh();
            } catch (e: unknown) {
                setError((e as Error)?.message ?? 'Settlement failed');
            }
        });
    }

    return (
        <span className="inline-flex flex-col items-end gap-1">
            {error && <span className="text-xs text-red-600">{error}</span>}
            <button
                type="button"
                disabled={pending || totalOwed <= 0}
                onClick={handlePay}
                className="btn-primary px-3 py-1 text-xs"
            >
                {pending ? 'Settling…' : 'Pay & Reset'}
            </button>
        </span>
    );
}
