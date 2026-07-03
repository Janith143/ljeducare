import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

interface RequestRow {
    id: string;
    email?: string;
    uid?: string;
    reason?: string;
    status?: string;
    createdAt?: string;
}

/** Data-privacy: account deletion requests + data-handling summary. */
export default async function AdminDataPrivacyPage() {
    await requirePermission('data_privacy');

    // deletion_requests is created by the public "request deletion" form; may be empty.
    let requests: RequestRow[] = [];
    try {
        const snap = await adminDb().collection('deletion_requests').get();
        requests = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<RequestRow, 'id'>) }))
            .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    } catch {
        requests = [];
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Data Privacy</h1>

            <section className="space-y-2">
                <h2 className="font-semibold">Account deletion requests ({requests.length})</h2>
                {requests.length ? (
                    <div className="card overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-light-border text-left dark:border-dark-border">
                                    <th className="p-3">Requested</th>
                                    <th className="p-3">Email / UID</th>
                                    <th className="p-3">Reason</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((r) => (
                                    <tr key={r.id} className="border-b border-light-border dark:border-dark-border">
                                        <td className="p-3 whitespace-nowrap">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                                        <td className="p-3">{r.email || r.uid || '—'}</td>
                                        <td className="p-3 text-light-subtle dark:text-dark-subtle">{r.reason || '—'}</td>
                                        <td className="p-3">{r.status || 'pending'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                        No pending deletion requests.
                    </p>
                )}
            </section>

            <section className="card space-y-2 text-sm">
                <h2 className="font-semibold">How student data is handled</h2>
                <ul className="list-inside list-disc space-y-1 text-light-subtle dark:text-dark-subtle">
                    <li>Personal data (name, email, mobile, guardian contact) is collected at registration and used only to operate classes and notify guardians.</li>
                    <li>Payment records are retained for financial/audit purposes; card details are never stored (handled by the gateway).</li>
                    <li>To erase a student, suspend them under <span className="font-mono">Users</span>, then delete their auth account and records on request.</li>
                    <li>Review your published <span className="font-mono">/privacy</span> policy to keep it aligned with actual practice.</li>
                </ul>
            </section>
        </div>
    );
}
