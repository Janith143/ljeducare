'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ApprovalStatus } from '@ljeducare/shared';
import { approveContentAction, rejectContentAction } from '@/app/admin/content/actions';

/**
 * Approve / request-changes for a class or course.
 *
 * Approval is offered from ANY unapproved state, not just 'pending': an admin holding
 * the `content` permission is the authority here, and requiring a teacher to press
 * "Submit for approval" first left drafts with no admin action available at all.
 * "Request changes" stays pending-only — there is no request to answer otherwise.
 */
export default function ApprovalButtons({
    kind,
    id,
    title,
    status,
}: {
    kind: 'class' | 'course' | 'quiz';
    id: string;
    title: string;
    status: ApprovalStatus;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function run(fn: () => Promise<{ ok?: boolean; error?: string }>) {
        setBusy(true);
        setError(null);
        const res = await fn();
        setBusy(false);
        if (res?.error) {
            setError(res.error);
            return;
        }
        router.refresh();
    }

    function approve() {
        if (!confirm(`Approve "${title}" and publish it to the public site?`)) return;
        void run(() => approveContentAction(kind, id));
    }

    function reject() {
        const note = prompt(`What needs changing in "${title}"?\n\nThe teacher sees this note.`);
        if (note === null) return; // cancelled
        void run(() => rejectContentAction(kind, id, note));
    }

    return (
        <span className="inline-flex items-center gap-2">
            {error && <span className="text-xs text-red-600">{error}</span>}
            <button type="button" onClick={approve} disabled={busy} className="btn-primary px-2 py-1 text-xs disabled:opacity-50">
                {busy ? '…' : 'Approve & publish'}
            </button>
            {status === 'pending' && (
                <button type="button" onClick={reject} disabled={busy} className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-50 dark:text-amber-400">
                    Request changes
                </button>
            )}
        </span>
    );
}
