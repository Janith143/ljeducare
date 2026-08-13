import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { formatCurrency, COLLECTIONS, SETTINGS_DOCS } from '@ljeducare/shared';
import BankTransferDetails, { type BankDetails } from '@/components/checkout/BankTransferDetails';
import SlipUploadClient from '@/components/checkout/SlipUploadClient';
import { getUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * Bank-transfer instructions + slip upload for a pending_slip sale — and a
 * status-appropriate explanation for every other state instead of a bare 404
 * (already paid, a card attempt didn't go through, canceled/refunded). A sale
 * lands here from any payment method's checkout button, not just bank transfer,
 * so it must make sense no matter what state the sale is actually in.
 */
export default async function SlipUploadPage({
    params,
}: {
    params: Promise<{ saleId: string }>;
}) {
    const { saleId } = await params;
    const user = await getUser();
    if (!user) redirect(`/login?next=/payment/slip/${saleId}`);

    const saleDoc = await adminDb().collection(COLLECTIONS.SALES).doc(saleId).get();
    if (!saleDoc.exists) notFound();
    const sale = saleDoc.data()!;
    const isOwner = sale.studentId === user.uid;
    if (!isOwner && !['main_admin', 'manager'].includes(user.role)) notFound();

    const hasSlip = !!sale.slipImageUrl;
    const awaitingSlip = sale.status === 'pending_slip' && !hasSlip;
    const slipSubmitted = sale.status === 'pending_slip' && hasSlip;
    const completed = sale.status === 'completed';
    const notCompleted = !completed && !awaitingSlip && !slipSubmitted;

    // Only load bank details when they're actually needed for this render.
    const bank = awaitingSlip
        ? (((await adminDb().doc(`${COLLECTIONS.SETTINGS}/${SETTINGS_DOCS.GATEWAYS}`).get()).data()?.bankDetails ??
              {}) as BankDetails)
        : null;

    const checkoutHref = ['class', 'course', 'quiz'].includes(sale.itemType)
        ? `/checkout/${sale.itemType}/${sale.itemId}`
        : '/student/transactions';

    const heading = completed
        ? 'Payment successful'
        : slipSubmitted
          ? 'Awaiting approval'
          : awaitingSlip
            ? 'Bank transfer'
            : 'Payment not completed';

    return (
        <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
            <h1 className="text-2xl font-bold">{heading}</h1>

            <section className="card space-y-1 text-sm">
                <p className="flex justify-between">
                    <span className="text-light-subtle dark:text-dark-subtle">Item</span>
                    <span className="font-medium">{sale.itemName}</span>
                </p>
                <p className="flex justify-between">
                    <span className="text-light-subtle dark:text-dark-subtle">
                        {awaitingSlip ? 'Amount to pay' : 'Amount'}
                    </span>
                    <span className="text-lg font-bold">
                        {sale.amount > 0 ? formatCurrency({ amount: sale.amount, currency: sale.currency }) : 'Free'}
                    </span>
                </p>
                <p className="flex justify-between">
                    <span className="text-light-subtle dark:text-dark-subtle">
                        {awaitingSlip ? 'Reference (write on the slip)' : 'Reference'}
                    </span>
                    <span className="font-mono">{sale.id}</span>
                </p>
            </section>

            {awaitingSlip && bank && <BankTransferDetails bank={bank} />}
            {awaitingSlip && <SlipUploadClient saleId={sale.id} />}

            {slipSubmitted && (
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Your slip is with the institute for verification — access opens once it&apos;s approved.
                </p>
            )}

            {completed && (
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    You&apos;re already enrolled — no further action needed.
                </p>
            )}

            {notCompleted && (
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    {sale.cancelReason ??
                        sale.rejectionReason ??
                        'No money was taken for this attempt. You can pay by bank transfer or try again.'}
                </p>
            )}

            <div className="flex justify-center gap-3">
                {completed && (
                    <Link href="/student" className="btn-primary">
                        Go to My Dashboard
                    </Link>
                )}
                {slipSubmitted && (
                    <Link href="/student/transactions" className="btn-primary">
                        My Payments
                    </Link>
                )}
                {notCompleted && (
                    <Link href={checkoutHref} className="btn-primary">
                        Pay by bank transfer
                    </Link>
                )}
            </div>
        </div>
    );
}
