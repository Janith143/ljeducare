'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteItemAction } from '@/app/admin/recycle-bin/actions';

/**
 * Move a class/course/quiz to the Recycle Bin.
 * Kept as a tiny client island so ContentTable stays a server component.
 */
export default function DeleteContentButton({
    kind,
    id,
    title,
}: {
    kind: 'class' | 'course' | 'quiz';
    id: string;
    title: string;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function remove() {
        if (
            !confirm(
                `Move "${title}" to the Recycle Bin?\n\nIt will disappear from the public site and from students' dashboards. ` +
                    `You can restore it from Recycle Bin at any time.`,
            )
        ) {
            return;
        }
        setBusy(true);
        setError(null);
        const res = await deleteItemAction(kind, id);
        setBusy(false);
        if (res?.error) {
            setError(res.error);
            return;
        }
        router.refresh();
    }

    return (
        <span className="inline-flex items-center gap-2">
            {error && <span className="text-xs text-red-600">{error}</span>}
            <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
            >
                {busy ? 'Deleting…' : 'Delete'}
            </button>
        </span>
    );
}
