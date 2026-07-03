import Link from 'next/link';
import type { Sale } from '@ljeducare/shared';
import { COLLECTIONS, formatCurrency } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<string, string> = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    pending_slip: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    pending_gateway: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    canceled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    refunded: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

/** The student's own payment history. */
export default async function StudentTransactionsPage() {
    const user = await requireRole('student');

    const snap = await adminDb().collection(COLLECTIONS.SALES).where('studentId', '==', user.uid).get();
    const sales = snap.docs
        .map((d) => d.data() as Sale)
        .sort((a, b) => b.saleDate.localeCompare(a.saleDate));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">My Payments</h1>
            {sales.length ? (
                <div className="card overflow-x-auto p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-light-border text-left dark:border-dark-border">
                                <th className="p-3">Date</th>
                                <th className="p-3">Item</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Method</th>
                                <th className="p-3">Reference</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.map((s) => (
                                <tr key={s.id} className="border-b border-light-border dark:border-dark-border">
                                    <td className="p-3 whitespace-nowrap">{s.saleDate.slice(0, 10)}</td>
                                    <td className="p-3 font-medium">{s.itemName}</td>
                                    <td className="p-3 whitespace-nowrap">
                                        {s.amount > 0 ? formatCurrency({ amount: s.amount, currency: s.currency }) : 'Free'}
                                    </td>
                                    <td className="p-3">{s.gateway ?? s.paymentMethod}</td>
                                    <td className="p-3 font-mono text-xs">{s.id}</td>
                                    <td className="p-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status] ?? ''}`}>
                                            {s.status.replace('_', ' ')}
                                        </span>
                                        {s.status === 'pending_slip' && (
                                            <Link href={`/payment/slip/${s.id}`} className="ml-2 text-xs text-primary hover:underline">
                                                Upload slip
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                    No payments yet — <Link href="/classes" className="text-primary hover:underline">browse classes</Link> to enroll.
                </p>
            )}
        </div>
    );
}
