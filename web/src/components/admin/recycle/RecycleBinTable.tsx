'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { purgeItemAction, restoreItemAction } from '@/app/admin/recycle-bin/actions';

export interface DeletedRow {
    id: string;
    kind: 'class' | 'course' | 'quiz';
    title: string;
    subject: string;
    teacher: string;
    deletedAt?: string;
}

export default function RecycleBinTable({ rows }: { rows: DeletedRow[] }) {
    if (!rows.length) {
        return <p className="card text-sm text-light-subtle dark:text-dark-subtle">The recycle bin is empty. 🗑️</p>;
    }
    return (
        <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-light-border text-left dark:border-dark-border">
                        <th className="p-3">Title</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Teacher</th>
                        <th className="p-3">Deleted</th>
                        <th className="p-3" />
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <Row key={`${row.kind}-${row.id}`} row={row} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Row({ row }: { row: DeletedRow }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function run(action: () => Promise<{ error?: string }>, confirmMsg?: string) {
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        startTransition(async () => {
            setError(null);
            const result = await action();
            if (result.error) setError(result.error);
            else router.refresh();
        });
    }

    return (
        <tr className="border-b border-light-border dark:border-dark-border">
            <td className="p-3">
                <span className="block font-medium">{row.title}</span>
                <span className="text-xs text-light-subtle dark:text-dark-subtle">{row.subject}</span>
                {error && <span className="block text-xs text-red-600">{error}</span>}
            </td>
            <td className="p-3">{row.kind}</td>
            <td className="p-3 text-light-subtle dark:text-dark-subtle">{row.teacher}</td>
            <td className="p-3 whitespace-nowrap text-light-subtle dark:text-dark-subtle">
                {row.deletedAt ? new Date(row.deletedAt).toLocaleDateString() : '—'}
            </td>
            <td className="space-x-2 p-3 text-right whitespace-nowrap">
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => restoreItemAction(row.kind, row.id))}
                    className="btn-secondary px-2 py-1 text-xs"
                >
                    Restore
                </button>
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => purgeItemAction(row.kind, row.id), `Permanently delete "${row.title}"? This cannot be undone.`)}
                    className="btn-secondary px-2 py-1 text-xs text-red-600"
                >
                    Delete forever
                </button>
            </td>
        </tr>
    );
}
