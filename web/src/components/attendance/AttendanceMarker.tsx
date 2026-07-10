'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { callFunction } from '@/lib/firebase/client';
import KioskBulkUpload from '@/components/kiosk/KioskBulkUpload';

export interface ClassOption {
    id: string;
    title: string;
}

interface AttendanceRow {
    studentId: string;
    studentName: string;
    attendedAt: string;
    paymentStatus: string;
}

interface MarkResult {
    success?: boolean;
    alreadyMarked?: boolean;
    studentName?: string;
    paymentStatus?: string;
}

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Mark attendance without a kiosk: pick a class + session date, then mark students
 * manually by ID (with cash/unpaid fallback for the unenrolled) or upload an Excel of
 * IDs. Reuses the same `markAttendance` / `getSessionAttendance` callables the kiosk
 * uses; the backend already allows teacher/manager/admin roles. `classes` is scoped by
 * the caller (a teacher gets only their own; an admin gets all published classes).
 */
export default function AttendanceMarker({ classes }: { classes: ClassOption[] }) {
    const [classId, setClassId] = useState(classes[0]?.id ?? '');
    const [date, setDate] = useState(todayISO());
    const [studentId, setStudentId] = useState('');
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null);
    const [notEnrolled, setNotEnrolled] = useState<string | null>(null);
    const [roster, setRoster] = useState<AttendanceRow[]>([]);
    // The mark/roster callables authenticate from the client SDK, which the app doesn't
    // sign in as a side-effect of the cookie session. Confirm it's signed in BEFORE
    // enabling any marking, so a click can't fire an unauthenticated call ("Kiosk or
    // staff sign-in required") — attendance cash-marks create sales, so reliability matters.
    const [authReady, setAuthReady] = useState(false);
    const [authError, setAuthError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { ensureClientSignedIn, getClientAuth } = await import('@/lib/firebase/client');
            for (let i = 0; i < 4 && !cancelled; i++) {
                try {
                    await ensureClientSignedIn({ refresh: true });
                    if (getClientAuth().currentUser) {
                        if (!cancelled) setAuthReady(true);
                        return;
                    }
                } catch {
                    /* retry */
                }
                await new Promise((r) => setTimeout(r, 500));
            }
            if (!cancelled) setAuthError(true);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const refreshRoster = useCallback(async () => {
        if (!classId || !authReady) {
            if (!classId) setRoster([]);
            return;
        }
        try {
            const res = await callFunction<
                { classId: string; sessionDate: string },
                { records: AttendanceRow[] }
            >('getSessionAttendance', { classId, sessionDate: date });
            setRoster(res.records);
        } catch {
            /* roster is best-effort */
        }
    }, [classId, date, authReady]);

    useEffect(() => {
        void refreshRoster();
    }, [refreshRoster]);

    // Changing class/date invalidates any pending cash/unpaid prompt.
    useEffect(() => {
        setNotEnrolled(null);
    }, [classId, date]);

    async function mark(id: string, payment: 'enrolled' | 'cash' | 'unpaid') {
        if (!classId || !authReady) return;
        setBusy(true);
        setFeedback(null);
        try {
            const res = await callFunction<
                { classId: string; studentId: string; payment: string; sessionDate: string },
                MarkResult
            >('markAttendance', { classId, studentId: id, payment, sessionDate: date });
            setNotEnrolled(null);
            setStudentId('');
            if (res.alreadyMarked) {
                setFeedback({ tone: 'warn', text: `${res.studentName} is already marked for this session.` });
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

    if (classes.length === 0) {
        return (
            <section className="card text-sm text-light-subtle dark:text-dark-subtle">
                No classes to mark attendance for yet. Schedule a class first.
            </section>
        );
    }

    return (
        <div className="space-y-4">
            {authError ? (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    Couldn&apos;t verify your session for marking. Please refresh the page and try again.
                </p>
            ) : !authReady ? (
                <p className="rounded-lg bg-light-bg p-3 text-sm text-light-subtle dark:bg-dark-bg dark:text-dark-subtle">
                    Preparing to mark attendance…
                </p>
            ) : null}

            {/* Class + date pickers */}
            <section className="card grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                    <span className="mb-1 block font-medium">Class</span>
                    <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.title}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block text-sm">
                    <span className="mb-1 block font-medium">Session date</span>
                    <input
                        type="date"
                        className="input"
                        value={date}
                        max={todayISO()}
                        onChange={(e) => setDate(e.target.value || todayISO())}
                    />
                </label>
            </section>

            {/* Manual mark */}
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
                    placeholder="Student ID (e.g. LJE0012DF)"
                    className="input flex-1"
                />
                <button type="submit" disabled={busy || !studentId.trim() || !classId || !authReady} className="btn-primary px-6">
                    {busy ? '…' : !authReady ? 'Preparing…' : 'Mark present'}
                </button>
            </form>

            {feedback && (
                <p role="status" className={`rounded-lg p-3 text-center font-semibold ${toneStyle[feedback.tone]}`}>
                    {feedback.text}
                </p>
            )}

            {notEnrolled && (
                <div className="card space-y-3 border-amber-400">
                    <p className="text-sm font-medium">
                        How is <span className="font-mono">{notEnrolled}</span> paying for this session?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" disabled={busy || !authReady} onClick={() => void mark(notEnrolled, 'cash')} className="btn-primary py-3">
                            Cash collected now
                        </button>
                        <button type="button" disabled={busy || !authReady} onClick={() => void mark(notEnrolled, 'unpaid')} className="btn-secondary py-3">
                            Mark unpaid (credit)
                        </button>
                    </div>
                    <button type="button" onClick={() => setNotEnrolled(null)} className="text-xs text-light-subtle hover:underline dark:text-dark-subtle">
                        Cancel
                    </button>
                </div>
            )}

            {/* Bulk Excel — re-mounts on class/date change so it targets the current selection.
                Mounts only once the client is signed in so uploads can't fire unauthenticated. */}
            {authReady && (
                <KioskBulkUpload key={`${classId}:${date}`} classId={classId} sessionDate={date} onDone={() => void refreshRoster()} />
            )}

            {/* Roster for the selected session */}
            <section className="card p-0">
                <p className="border-b border-light-border p-3 text-sm font-semibold dark:border-dark-border">
                    Marked this session ({roster.length})
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
                        <li className="p-3 text-sm text-light-subtle dark:text-dark-subtle">No marks yet for this session.</li>
                    )}
                </ul>
            </section>
        </div>
    );
}
