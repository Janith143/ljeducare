'use client';

import { useMemo, useState } from 'react';

export interface AttendanceRecordRow {
    id: string;
    sessionDate: string;
    classId: string;
    classTitle: string;
    studentName: string;
    studentId: string;
    paymentStatus: string;
    attendedAt: string;
}

/** Filterable attendance report with CSV export (ports TIAttendanceReportTab basics). */
export default function AttendanceReport({ records }: { records: AttendanceRecordRow[] }) {
    const classes = useMemo(
        () => [...new Map(records.map((r) => [r.classId, r.classTitle])).entries()],
        [records],
    );
    const [classFilter, setClassFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');

    const filtered = records.filter(
        (r) =>
            (classFilter === 'all' || r.classId === classFilter) &&
            (!dateFilter || r.sessionDate === dateFilter),
    );

    function downloadCsv() {
        const header = 'Date,Class,Student,Student ID,Payment,Marked at';
        const rows = filtered.map((r) =>
            [r.sessionDate, r.classTitle, r.studentName, r.studentId, r.paymentStatus, r.attendedAt]
                .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                .join(','),
        );
        const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `attendance-${dateFilter || 'all'}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="input max-w-xs">
                    <option value="all">All classes</option>
                    {classes.map(([id, title]) => (
                        <option key={id} value={id}>{title}</option>
                    ))}
                </select>
                <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input max-w-44" />
                <span className="text-sm text-light-subtle dark:text-dark-subtle">{filtered.length} records</span>
                <button type="button" onClick={downloadCsv} disabled={!filtered.length} className="btn-secondary ml-auto px-3 py-1.5 text-sm">
                    ⬇ Download CSV
                </button>
            </div>
            <div className="card overflow-x-auto p-0">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-light-border text-left dark:border-dark-border">
                            <th className="p-3">Date</th>
                            <th className="p-3">Class</th>
                            <th className="p-3">Student</th>
                            <th className="p-3">Payment</th>
                            <th className="p-3">Marked at</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.slice(0, 200).map((r) => (
                            <tr key={r.id} className="border-b border-light-border dark:border-dark-border">
                                <td className="p-3 whitespace-nowrap">{r.sessionDate}</td>
                                <td className="p-3">{r.classTitle}</td>
                                <td className="p-3">{r.studentName}</td>
                                <td className="p-3">{r.paymentStatus}</td>
                                <td className="p-3 whitespace-nowrap text-light-subtle dark:text-dark-subtle">
                                    {new Date(r.attendedAt).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        {!filtered.length && (
                            <tr>
                                <td colSpan={5} className="p-3 text-light-subtle dark:text-dark-subtle">
                                    No records match the filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
