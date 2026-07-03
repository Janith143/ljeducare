import { notFound } from 'next/navigation';
import { formatCurrency, COLLECTIONS, SETTINGS_DOCS } from '@ljeducare/shared';
import SlipUploadClient from '@/components/checkout/SlipUploadClient';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/** Bank-transfer instructions + slip upload for a pending_slip sale. */
export default async function SlipUploadPage({
    params,
}: {
    params: Promise<{ saleId: string }>;
}) {
    const user = await requireRole('student');
    const { saleId } = await params;

    const [saleDoc, gatewaysDoc] = await Promise.all([
        adminDb().collection(COLLECTIONS.SALES).doc(saleId).get(),
        adminDb().doc(`${COLLECTIONS.SETTINGS}/${SETTINGS_DOCS.GATEWAYS}`).get(),
    ]);
    if (!saleDoc.exists) notFound();
    const sale = saleDoc.data()!;
    if (sale.studentId !== user.uid || sale.status !== 'pending_slip') notFound();

    const bank = (gatewaysDoc.data()?.bankDetails ?? {}) as {
        bankName?: string; accountName?: string; accountNumber?: string; branch?: string; instructions?: string;
    };

    return (
        <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
            <h1 className="text-2xl font-bold">Bank transfer</h1>
            <section className="card space-y-1 text-sm">
                <p className="flex justify-between">
                    <span className="text-light-subtle dark:text-dark-subtle">Item</span>
                    <span className="font-medium">{sale.itemName}</span>
                </p>
                <p className="flex justify-between">
                    <span className="text-light-subtle dark:text-dark-subtle">Amount to pay</span>
                    <span className="text-lg font-bold">
                        {formatCurrency({ amount: sale.amount, currency: sale.currency })}
                    </span>
                </p>
                <p className="flex justify-between">
                    <span className="text-light-subtle dark:text-dark-subtle">Reference (write on the slip)</span>
                    <span className="font-mono">{sale.id}</span>
                </p>
            </section>

            <section className="card space-y-1 text-sm">
                <h2 className="mb-1 font-semibold">Institute bank account</h2>
                {bank.accountNumber ? (
                    <>
                        <p>{bank.bankName} {bank.branch ? `— ${bank.branch}` : ''}</p>
                        <p className="font-medium">{bank.accountName}</p>
                        <p className="font-mono text-lg">{bank.accountNumber}</p>
                        {bank.instructions && (
                            <p className="text-light-subtle dark:text-dark-subtle">{bank.instructions}</p>
                        )}
                    </>
                ) : (
                    <p className="text-light-subtle dark:text-dark-subtle">
                        Bank details will be shared by the institute office — contact us if unsure.
                    </p>
                )}
            </section>

            <SlipUploadClient saleId={sale.id} />
        </div>
    );
}
