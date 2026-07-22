import { formatCurrencyCompact, TEACHING_ROLES } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import {
    computeUnsettledCommission,
    getOwnStaffProfile,
    listTeacherPayments,
} from '@/lib/data/teacher';

export const dynamic = 'force-dynamic';

const lkr = (amount: number) => formatCurrencyCompact({ amount, currency: 'LKR' });

export default async function TeacherEarningsPage() {
    const user = await requireRole(...TEACHING_ROLES);
    const staff = await getOwnStaffProfile(user);

    if (!staff) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">Earnings</h1>
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                    No teacher profile is linked to this account, so there are no earnings to show.
                </p>
            </div>
        );
    }

    const [unsettled, payments] = await Promise.all([
        computeUnsettledCommission(staff.id, staff.lastReset),
        listTeacherPayments(staff.id),
    ]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">My Earnings</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Your commission rate is <span className="font-semibold">{staff.commissionRate}%</span> of
                each sale. The institute settles balances with &ldquo;Pay &amp; Reset&rdquo;.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="card">
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">Owed to you (online sales)</p>
                    <p className="mt-1 text-2xl font-bold">{lkr(unsettled)}</p>
                </div>
                <div className="card">
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">Cash collected at venue</p>
                    <p className="mt-1 text-2xl font-bold">{lkr(staff.manualBalance ?? 0)}</p>
                </div>
                <div className="card">
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">Lifetime commission</p>
                    <p className="mt-1 text-2xl font-bold">{lkr(staff.totalEarned ?? 0)}</p>
                </div>
            </div>

            <section className="space-y-2">
                <h2 className="font-semibold">Payment history</h2>
                {payments.length ? (
                    <div className="card overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-light-border text-left dark:border-dark-border">
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Amount</th>
                                    <th className="p-3">Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p) => (
                                    <tr key={p.id} className="border-b border-light-border dark:border-dark-border">
                                        <td className="p-3 whitespace-nowrap">{p.paidAt.slice(0, 10)}</td>
                                        <td className="p-3 font-medium">{lkr(p.amountPaid)}</td>
                                        <td className="p-3 text-light-subtle dark:text-dark-subtle">{p.note ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="card text-sm text-light-subtle dark:text-dark-subtle">No settlements yet.</p>
                )}
            </section>
        </div>
    );
}
