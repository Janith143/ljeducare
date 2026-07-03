'use client';

import { useRef, useState } from 'react';
import { callFunction } from '@/lib/firebase/client';
import { downloadAttendanceTemplate, parseAttendanceExcel } from '@/lib/attendanceTemplate';

interface Summary {
    marked: number;
    already: number;
    unpaid: number;
    failed: number;
    total: number;
}

/** Mark a whole class's attendance from an uploaded Excel of student IDs. */
export default function KioskBulkUpload({ classId, onDone }: { classId: string; onDone?: () => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState('');
    const [summary, setSummary] = useState<Summary | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleFile(file: File) {
        setError(null);
        setSummary(null);
        setBusy(true);
        try {
            const rows = await parseAttendanceExcel(file);
            const s: Summary = { marked: 0, already: 0, unpaid: 0, failed: 0, total: rows.length };
            for (let i = 0; i < rows.length; i++) {
                setProgress(`Marking ${i + 1} / ${rows.length}…`);
                try {
                    const res = await callFunction<
                        { classId: string; studentId: string; payment: string },
                        { alreadyMarked?: boolean; paymentStatus?: string }
                    >('markAttendance', { classId, studentId: rows[i].studentId, payment: rows[i].payment });
                    if (res.alreadyMarked) s.already++;
                    else if (res.paymentStatus === 'unpaid') s.unpaid++;
                    else s.marked++;
                } catch {
                    s.failed++;
                }
            }
            setSummary(s);
            onDone?.();
        } catch (e: unknown) {
            setError((e as Error)?.message ?? 'Upload failed.');
        } finally {
            setBusy(false);
            setProgress('');
            if (fileRef.current) fileRef.current.value = '';
        }
    }

    return (
        <section className="card space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Bulk attendance (Excel)</h2>
                <div className="flex gap-2">
                    <button type="button" onClick={() => void downloadAttendanceTemplate()} className="btn-secondary px-3 py-1 text-xs">
                        ⬇ Template
                    </button>
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="btn-secondary px-3 py-1 text-xs">
                        {busy ? 'Uploading…' : '⬆ Upload .xlsx'}
                    </button>
                    <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])} />
                </div>
            </div>
            {progress && <p className="text-xs text-light-subtle dark:text-dark-subtle">{progress}</p>}
            {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
            {summary && (
                <p className="rounded-lg bg-green-50 p-2 text-xs text-green-800 dark:bg-green-950 dark:text-green-300">
                    {summary.total} rows · {summary.marked} marked · {summary.unpaid} unpaid · {summary.already} already · {summary.failed} failed
                </p>
            )}
        </section>
    );
}
