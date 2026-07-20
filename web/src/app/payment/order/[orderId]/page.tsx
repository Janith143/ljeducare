import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { DocumentReference } from 'firebase-admin/firestore';
import { formatCurrency, COLLECTIONS, SETTINGS_DOCS } from '@ljeducare/shared';
import ClearCartOnMount from '@/components/cart/ClearCartOnMount';
import BankTransferDetails, { type BankDetails } from '@/components/checkout/BankTransferDetails';
import OrderSlipUpload from '@/components/checkout/OrderSlipUpload';
import { getUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = await params;
    const user = await getUser();
    const db = adminDb();

    const doc = await db.collection('orders').doc(orderId).get();
    if (!doc.exists) notFound();
    const order = doc.data()!;
    if (!user || (order.studentId !== user.uid && !['main_admin', 'manager'].includes(user.role))) notFound();

    const saleIds: string[] = order.saleIds ?? [];
    const refs: DocumentReference[] = saleIds.map((id) => db.collection('sales').doc(id));
    const sales = refs.length ? (await db.getAll(...refs)).filter((s) => s.exists).map((s) => s.data()!) : [];

    const completed = order.status === 'completed';
    const pendingSlip = order.status === 'pending_slip';
    const hasSlip = !!order.slipImageUrl;
    const failed = order.status === 'failed';

    // A student paying a cart order by bank transfer needs the account + QR too —
    // only load it when it's actually relevant (awaiting a slip).
    const bank =
        pendingSlip && !hasSlip
            ? ((await db.doc(`${COLLECTIONS.SETTINGS}/${SETTINGS_DOCS.GATEWAYS}`).get()).data()?.bankDetails ??
              {}) as BankDetails
            : null;

    const icon = completed ? '✓' : failed ? '✕' : '🕓';
    const iconBg = completed ? 'bg-green-100' : failed ? 'bg-red-100' : 'bg-amber-100';
    const heading = completed ? 'Payment successful!' : failed ? 'Payment not completed' : pendingSlip ? 'Awaiting approval' : 'Payment pending';

    return (
        <div className="mx-auto max-w-lg space-y-6 px-4 py-16 text-center">
            {(completed || pendingSlip) && <ClearCartOnMount />}

            <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${iconBg}`}>{icon}</span>
            <h1 className="text-2xl font-bold">{heading}</h1>

            <div className="card space-y-2 text-left text-sm">
                <p className="font-medium">Order {order.orderId}</p>
                <ul className="space-y-1">
                    {sales.map((s) => (
                        <li key={s.id} className="flex justify-between gap-2">
                            <span className="truncate">{s.itemName}</span>
                            <span>{s.amount > 0 ? formatCurrency({ amount: s.amount, currency: s.currency }) : 'Free'}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex justify-between border-t border-light-border pt-2 font-semibold dark:border-dark-border">
                    <span>Total</span>
                    <span>{order.amount > 0 ? formatCurrency({ amount: order.amount, currency: order.currency }) : 'Free'}</span>
                </div>
            </div>

            {pendingSlip && !hasSlip && bank && <BankTransferDetails bank={bank} />}
            {pendingSlip && !hasSlip && <OrderSlipUpload orderId={order.orderId} />}
            {pendingSlip && hasSlip && (
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Your slip is with the institute for verification — access opens once approved.
                </p>
            )}
            {completed && <p className="text-sm text-light-subtle dark:text-dark-subtle">You&apos;re enrolled in every item. Happy learning!</p>}
            {failed && (
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    The payment didn&apos;t go through. You can try again from your cart.
                </p>
            )}

            <div className="flex justify-center gap-3">
                <Link href="/student" className="btn-primary">Go to My Dashboard</Link>
                {failed ? <Link href="/cart" className="btn-secondary">Back to cart</Link> : <Link href="/categories" className="btn-secondary">Browse more</Link>}
            </div>
        </div>
    );
}
