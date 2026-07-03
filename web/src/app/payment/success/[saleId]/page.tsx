import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@ljeducare/shared';
import { getUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function PaymentSuccessPage({
    params,
}: {
    params: Promise<{ saleId: string }>;
}) {
    const { saleId } = await params;
    const user = await getUser();
    const doc = await adminDb().collection('sales').doc(saleId).get();
    if (!doc.exists) notFound();
    const sale = doc.data()!;
    // Only the buyer (or admins) may view the receipt.
    if (!user || (sale.studentId !== user.uid && !['main_admin', 'manager'].includes(user.role))) notFound();

    const pendingSlip = sale.status === 'pending_slip';

    return (
        <div className="mx-auto max-w-md space-y-6 px-4 py-20 text-center">
            <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${pendingSlip ? 'bg-amber-100' : 'bg-green-100'}`}>
                {pendingSlip ? '🕓' : '✓'}
            </span>
            <h1 className="text-2xl font-bold">
                {pendingSlip ? 'Awaiting approval' : 'Payment successful!'}
            </h1>
            <div className="card space-y-1 text-left text-sm">
                <p><span className="text-light-subtle dark:text-dark-subtle">Item:</span> {sale.itemName}</p>
                <p>
                    <span className="text-light-subtle dark:text-dark-subtle">Amount:</span>{' '}
                    {sale.amount > 0 ? formatCurrency({ amount: sale.amount, currency: sale.currency }) : 'Free'}
                </p>
                <p><span className="text-light-subtle dark:text-dark-subtle">Reference:</span> {sale.id}</p>
                <p><span className="text-light-subtle dark:text-dark-subtle">Status:</span> {sale.status}</p>
            </div>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                {pendingSlip
                    ? 'Your slip is with the institute for verification — access opens once approved.'
                    : 'You are enrolled. See you in class!'}
            </p>
            <div className="flex justify-center gap-3">
                <Link href="/student" className="btn-primary">Go to My Dashboard</Link>
                <Link href="/classes" className="btn-secondary">Browse more</Link>
            </div>
        </div>
    );
}
