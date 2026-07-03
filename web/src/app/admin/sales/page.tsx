import { formatCurrency, formatCurrencyCompact } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { listAllSales } from '@/lib/data/adminStats';

export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<string, string> = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    pending_slip: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    pending_gateway: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    canceled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    refunded: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

export default async function AdminSalesPage() {
    await requirePermission('sales');
    const sales = await listAllSales();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">All Sales</h1>
            {sales.length ? (
                <div className="card overflow-x-auto p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-light-border text-left dark:border-dark-border">
                                <th className="p-3">Date</th>
                                <th className="p-3">Reference</th>
                                <th className="p-3">Student</th>
                                <th className="p-3">Item</th>
                                <th className="p-3">Charged</th>
                                <th className="p-3">LKR value</th>
                                <th className="p-3">Teacher share</th>
                                <th className="p-3">Method</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.map((s) => (
                                <tr key={s.id} className="border-b border-light-border dark:border-dark-border">
                                    <td className="p-3 whitespace-nowrap">{s.saleDate.slice(0, 10)}</td>
                                    <td className="p-3 font-mono text-xs">{s.id}</td>
                                    <td className="p-3">{s.studentSnapshot?.name || s.studentId}</td>
                                    <td className="p-3">{s.itemName}</td>
                                    <td className="p-3 whitespace-nowrap">
                                        {s.amount > 0 ? formatCurrency({ amount: s.amount, currency: s.currency }) : 'Free'}
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        {s.baseAmount > 0 ? formatCurrencyCompact({ amount: s.baseAmount, currency: 'LKR' }) : '—'}
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        {s.teacherCommission
                                            ? formatCurrencyCompact({ amount: s.teacherCommission, currency: 'LKR' })
                                            : '—'}
                                    </td>
                                    <td className="p-3">{s.gateway ?? s.paymentMethod}</td>
                                    <td className="p-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status] ?? ''}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">No sales yet.</p>
            )}
        </div>
    );
}
