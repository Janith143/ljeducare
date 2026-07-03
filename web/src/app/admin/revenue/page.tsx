import { COLLECTIONS, formatCurrencyCompact, type StaffMember, type TeacherPayment } from '@ljeducare/shared';
import PayTeacherButton from '@/components/admin/revenue/PayTeacherButton';
import { requirePermission } from '@/lib/auth/session';
import { getAdminStats } from '@/lib/data/adminStats';
import { computeUnsettledCommission } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

const lkr = (amount: number) => formatCurrencyCompact({ amount, currency: 'LKR' });

export default async function AdminRevenuePage() {
    await requirePermission('revenue');
    const db = adminDb();

    const [stats, staffSnap, paymentsSnap] = await Promise.all([
        getAdminStats(),
        db.collection(COLLECTIONS.STAFF).get(),
        db.collection(COLLECTIONS.TEACHER_PAYMENTS).get(),
    ]);

    const staff = staffSnap.docs
        .map((d) => ({ ...(d.data() as StaffMember), id: d.id }))
        .filter((s) => !s.isDeleted);
    const balances = await Promise.all(
        staff.map(async (s) => {
            const commission = await computeUnsettledCommission(s.id, s.lastReset);
            const manual = s.manualBalance ?? 0;
            return { staff: s, commission, manual, total: Math.round((commission + manual) * 100) / 100 };
        }),
    );
    const payments = paymentsSnap.docs
        .map((d) => d.data() as TeacherPayment)
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
        .slice(0, 50);

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold">Revenue</h1>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="card">
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">Revenue this month</p>
                    <p className="mt-1 text-2xl font-bold">{lkr(stats.revenueThisMonth)}</p>
                </div>
                <div className="card">
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">Revenue all-time</p>
                    <p className="mt-1 text-2xl font-bold">{lkr(stats.revenueAllTime)}</p>
                </div>
                <div className="card">
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">Owed to teachers</p>
                    <p className="mt-1 text-2xl font-bold">
                        {lkr(balances.reduce((a, b) => a + b.total, 0))}
                    </p>
                </div>
            </div>

            <section className="space-y-2">
                <h2 className="font-semibold">Balances owed to teachers</h2>
                <div className="card overflow-x-auto p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-light-border text-left dark:border-dark-border">
                                <th className="p-3">Teacher</th>
                                <th className="p-3">Commission %</th>
                                <th className="p-3">Online commission</th>
                                <th className="p-3">Cash at venue</th>
                                <th className="p-3">Total owed</th>
                                <th className="p-3">Last paid</th>
                                <th className="p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {balances.map(({ staff: s, commission, manual, total }) => (
                                <tr key={s.id} className="border-b border-light-border dark:border-dark-border">
                                    <td className="p-3 font-medium">{s.name}</td>
                                    <td className="p-3">{s.commissionRate}%</td>
                                    <td className="p-3">{lkr(commission)}</td>
                                    <td className="p-3">{lkr(manual)}</td>
                                    <td className="p-3 font-semibold">{lkr(total)}</td>
                                    <td className="p-3 text-light-subtle dark:text-dark-subtle">
                                        {s.lastReset ? s.lastReset.slice(0, 10) : 'Never'}
                                    </td>
                                    <td className="p-3 text-right">
                                        <PayTeacherButton staffId={s.id} teacherName={s.name} totalOwed={total} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="space-y-2">
                <h2 className="font-semibold">Teacher payment history</h2>
                {payments.length ? (
                    <div className="card overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-light-border text-left dark:border-dark-border">
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Teacher</th>
                                    <th className="p-3">Amount</th>
                                    <th className="p-3">Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p) => (
                                    <tr key={p.id} className="border-b border-light-border dark:border-dark-border">
                                        <td className="p-3 whitespace-nowrap">{p.paidAt.slice(0, 10)}</td>
                                        <td className="p-3">{p.teacherName}</td>
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
