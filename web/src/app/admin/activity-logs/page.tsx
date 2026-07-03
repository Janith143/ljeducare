import { COLLECTIONS } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

interface LogRow {
    id: string;
    action: string;
    performedBy: string;
    userRole?: string;
    level?: string;
    timestamp?: string;
    params?: Record<string, unknown>;
}

const LEVEL_STYLE: Record<string, string> = {
    ERROR: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    INFO: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

/** Audit trail — most recent activity_logs entries. */
export default async function AdminActivityLogsPage() {
    await requirePermission('activity_logs');

    const snap = await adminDb().collection(COLLECTIONS.ACTIVITY_LOGS).get();
    const logs = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<LogRow, 'id'>) }))
        .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
        .slice(0, 200);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Activity Logs</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                The 200 most recent audited actions across the platform.
            </p>

            {logs.length ? (
                <div className="card overflow-x-auto p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-light-border text-left dark:border-dark-border">
                                <th className="p-3">Time</th>
                                <th className="p-3">Level</th>
                                <th className="p-3">Action</th>
                                <th className="p-3">By</th>
                                <th className="p-3">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} className="border-b border-light-border align-top dark:border-dark-border">
                                    <td className="p-3 whitespace-nowrap text-light-subtle dark:text-dark-subtle">
                                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                                    </td>
                                    <td className="p-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLE[log.level ?? 'INFO'] ?? LEVEL_STYLE.INFO}`}>
                                            {log.level ?? 'INFO'}
                                        </span>
                                    </td>
                                    <td className="p-3 font-medium">{log.action}</td>
                                    <td className="p-3 text-light-subtle dark:text-dark-subtle">
                                        {log.performedBy}{log.userRole ? ` (${log.userRole})` : ''}
                                    </td>
                                    <td className="max-w-xs truncate p-3 font-mono text-xs text-light-subtle dark:text-dark-subtle">
                                        {log.params ? JSON.stringify(log.params) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                    No activity logged yet.
                </p>
            )}
        </div>
    );
}
