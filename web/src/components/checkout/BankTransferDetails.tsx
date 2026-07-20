/* eslint-disable @next/next/no-img-element */

export interface BankDetails {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    branch?: string;
    instructions?: string;
    qrImageUrl?: string;
}

/**
 * Institute bank account + payment QR, shown to a student paying by bank transfer.
 * Shared by the single-sale slip page and the cart-order page so both surfaces stay
 * in sync (the cart page previously showed no account details at all).
 */
export default function BankTransferDetails({ bank }: { bank: BankDetails }) {
    const hasAccount = !!bank.accountNumber;
    const hasQr = !!bank.qrImageUrl;

    if (!hasAccount && !hasQr) {
        return (
            <section className="card space-y-1 text-left text-sm">
                <h2 className="mb-1 font-semibold">Institute bank account</h2>
                <p className="text-light-subtle dark:text-dark-subtle">
                    Bank details will be shared by the institute office — contact us if unsure.
                </p>
            </section>
        );
    }

    return (
        <section className="card space-y-3 text-left text-sm">
            <h2 className="font-semibold">Institute bank account</h2>
            <div className="flex flex-wrap items-start gap-4">
                {hasAccount && (
                    <div className="min-w-[12rem] flex-1 space-y-0.5">
                        <p>
                            {bank.bankName} {bank.branch ? `— ${bank.branch}` : ''}
                        </p>
                        <p className="font-medium">{bank.accountName}</p>
                        <p className="font-mono text-lg">{bank.accountNumber}</p>
                        {bank.instructions && (
                            <p className="pt-1 text-light-subtle dark:text-dark-subtle">{bank.instructions}</p>
                        )}
                    </div>
                )}
                {hasQr && (
                    <figure className="shrink-0 text-center">
                        <img
                            src={bank.qrImageUrl}
                            alt="Scan to pay"
                            className="h-40 w-40 rounded-lg border border-light-border bg-white object-contain p-1 dark:border-dark-border"
                        />
                        <figcaption className="mt-1 text-xs text-light-subtle dark:text-dark-subtle">Scan to pay</figcaption>
                    </figure>
                )}
            </div>
        </section>
    );
}
