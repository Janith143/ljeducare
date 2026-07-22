'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LiveClass } from '@ljeducare/shared';
import {
    APPROVAL_LABEL,
    APPROVAL_STYLE,
    approvalOf,
    canPublish,
    canSubmit,
    formatCurrencyCompact,
} from '@ljeducare/shared';
import {
    deleteClassAction,
    submitClassForApprovalAction,
    togglePublishClassAction,
    withdrawClassApprovalAction,
} from '@/app/teacher/classes/actions';

export default function ClassListTable({ classes }: { classes: LiveClass[] }) {
    if (!classes.length) {
        return (
            <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                No classes yet — create your first one.
            </p>
        );
    }
    return (
        <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-light-border text-left dark:border-dark-border">
                        <th className="p-3">Class</th>
                        <th className="p-3">Schedule</th>
                        <th className="p-3">Fee</th>
                        <th className="p-3">Approval</th>
                        <th className="p-3">Status</th>
                        <th className="p-3" />
                    </tr>
                </thead>
                <tbody>
                    {classes.map((cls) => (
                        <Row key={cls.id} cls={cls} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Row({ cls }: { cls: LiveClass }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function run(action: () => Promise<{ error?: string }>) {
        startTransition(async () => {
            setError(null);
            const result = await action();
            if (result.error) setError(result.error);
            else router.refresh();
        });
    }

    const approval = approvalOf(cls.adminApproval);
    const note = (cls as { approvalNote?: string }).approvalNote;

    return (
        <tr className="border-b border-light-border dark:border-dark-border">
            <td className="p-3">
                <span className="block font-medium">{cls.title}</span>
                <span className="text-xs text-light-subtle dark:text-dark-subtle">
                    {cls.subject} · {cls.targetAudience}
                </span>
                {error && <span className="block text-xs text-red-600">{error}</span>}
            </td>
            <td className="p-3 whitespace-nowrap">
                {cls.recurrence === 'weekly' ? 'Weekly' : cls.date} · {cls.startTime}–{cls.endTime}
            </td>
            <td className="p-3 whitespace-nowrap">
                {cls.pricing?.isFree || !cls.pricing?.basePrice
                    ? 'Free'
                    : formatCurrencyCompact({ amount: cls.pricing.basePrice, currency: 'LKR' })}
            </td>
            <td className="p-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${APPROVAL_STYLE[approval]}`}>
                    {APPROVAL_LABEL[approval]}
                </span>
                {approval === 'rejected' && note && (
                    <span className="mt-1 block max-w-[14rem] text-xs text-red-600">{note}</span>
                )}
            </td>
            <td className="p-3">
                <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        cls.isPublished
                            ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                >
                    {cls.isPublished ? 'Published' : 'Draft'}
                </span>
            </td>
            <td className="space-x-2 p-3 text-right whitespace-nowrap">
                <Link href={`/teacher/classes/${cls.id}/edit`} className="btn-secondary px-2 py-1 text-xs">
                    Edit
                </Link>
                {/* Publishing is gated on approval: submit first, then the toggle unlocks. */}
                {canSubmit(approval) && (
                    <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => submitClassForApprovalAction(cls.id))}
                        className="btn-secondary px-2 py-1 text-xs"
                    >
                        {approval === 'rejected' ? 'Resubmit' : 'Submit for approval'}
                    </button>
                )}
                {approval === 'pending' && (
                    <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => withdrawClassApprovalAction(cls.id))}
                        className="btn-secondary px-2 py-1 text-xs"
                    >
                        Withdraw
                    </button>
                )}
                {canPublish(approval) && (
                    <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => togglePublishClassAction(cls.id, !cls.isPublished))}
                        className="btn-secondary px-2 py-1 text-xs"
                    >
                        {cls.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                )}
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                        if (window.confirm(`Delete "${cls.title}"? It moves to the recycle bin.`)) {
                            run(() => deleteClassAction(cls.id));
                        }
                    }}
                    className="btn-secondary px-2 py-1 text-xs text-red-600"
                >
                    Delete
                </button>
            </td>
        </tr>
    );
}
