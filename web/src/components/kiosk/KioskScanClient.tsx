'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { callFunction } from '@/lib/firebase/client';
import KioskCameraScanner from './KioskCameraScanner';

interface MarkResult {
    success?: boolean;
    alreadyMarked?: boolean;
    studentName?: string;
    paymentStatus?: string;
}

interface AttendanceRow {
    studentId: string;
    studentName: string;
    attendedAt: string;
    paymentStatus: string;
}

/** Kiosk marking UI: camera QR or manual ID, with cash/unpaid fallback for non-enrolled. */
export default function KioskScanClient({ classId, feeLabel }: { classId: string; feeLabel: string }) {
    const [studentId, setStudentId] = useState('');
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null);
    const [notEnrolled, setNotEnrolled] = useState<string | null>(null); // studentId awaiting cash/unpaid choice
    const [roster, setRoster] = useState<AttendanceRow[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const refreshRoster = useCallback(async () => {
        try {
            const res = await callFunction<{ classId: string }, { records: AttendanceRow[] }>(
                'getSessionAttendance',
                { classId },
            );
            setRoster(res.records);
        } catch {
            /* roster is best-effort */
        }
    }, [classId]);

    useEffect(() => {
        void refreshRoster();
    }, [refreshRoster]);

    async function mark(id: string, payment: 'enrolled' | 'cash' | 'unpaid') {
        setBusy(true);
        setFeedback(null);
        try {
            const res = await callFunction<
                { classId: string; studentId: string; payment: string },
                MarkResult
            >('markAttendance', { classId, studentId: id, payment });
            setNotEnrolled(null);
            setStudentId('');
            if (res.alreadyMarked) {
                setFeedback({ tone: 'warn', text: `${res.studentName} is already marked for today.` });
            } else {
                const suffix =
                    res.paymentStatus === 'paid_at_venue'
                        ? ' (cash collected)'
                        : res.paymentStatus === 'unpaid'
                          ? ' (marked UNPAID)'
                          : '';
                setFeedback({ tone: 'ok', text: `✓ ${res.studentName} marked present${suffix}` });
            }
            void refreshRoster();
        } catch (e: unknown) {
            const message = (e as Error)?.message ?? '';
            if (message.includes('NOT_ENROLLED')) {
                setNotEnrolled(id);
                setFeedback({ tone: 'warn', text: 'Student has no active enrollment for this class.' });
            } else {
                setFeedback({ tone: 'err', text: message || 'Marking failed — try again.' });
            }
        } finally {
            setBusy(false);
            inputRef.current?.focus();
        }
    }

    const toneStyle = {
        ok: 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300',
        warn: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        err: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    } as const;

    return (
        <div className="space-y-4">
            <KioskCameraScanner disabled={busy} onScan={(value) => void mark(value, 'enrolled')} />

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (studentId.trim()) void mark(studentId.trim(), 'enrolled');
                }}
                className="card flex gap-2"
            >
                <input
                    ref={inputRef}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Student ID (scan QR or type)"
                    className="input flex-1"
                    autoFocus
                />
                <button type="submit" disabled={busy || !studentId.trim()} className="btn-primary px-6">
                    {busy ? '…' : 'Mark'}
                </button>
            </form>

            {feedback && (
                <p role="status" className={`rounded-lg p-3 text-center text-lg font-semibold ${toneStyle[feedback.tone]}`}>
                    {feedback.text}
                </p>
            )}

            {notEnrolled && (
                <div className="card space-y-3 border-amber-400">
                    <p className="text-sm font-medium">
                        {feeLabel}. How is <span className="font-mono">{notEnrolled}</span> paying?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" disabled={busy} onClick={() => void mark(notEnrolled, 'cash')} className="btn-primary py-3">
                            Cash collected now
                        </button>
                        <button type="button" disabled={busy} onClick={() => void mark(notEnrolled, 'unpaid')} className="btn-secondary py-3">
                            Mark unpaid (credit)
                        </button>
                    </div>
                    <button type="button" onClick={() => setNotEnrolled(null)} className="text-xs text-light-subtle hover:underline dark:text-dark-subtle">
                        Cancel
                    </button>
                </div>
            )}

            <section className="card p-0">
                <p className="border-b border-light-border p-3 text-sm font-semibold dark:border-dark-border">
                    Today&apos;s attendance ({roster.length})
                </p>
                <ul className="max-h-72 divide-y divide-light-border overflow-y-auto dark:divide-dark-border">
                    {roster.map((row) => (
                        <li key={row.studentId} className="flex items-center justify-between p-3 text-sm">
                            <span className="font-medium">{row.studentName}</span>
                            <span className="text-xs text-light-subtle dark:text-dark-subtle">
                                {new Date(row.attendedAt).toLocaleTimeString()} · {row.paymentStatus}
                            </span>
                        </li>
                    ))}
                    {!roster.length && (
                        <li className="p-3 text-sm text-light-subtle dark:text-dark-subtle">No marks yet.</li>
                    )}
                </ul>
            </section>
        </div>
    );
}
