import { Suspense } from 'react';
import PaymentRedirectClient from '@/components/checkout/PaymentRedirectClient';

export const dynamic = 'force-dynamic';

/** Gateway return URL — PayPal sends the payer back here after approval. */
export default function PaymentRedirectPage() {
    return (
        <div className="mx-auto max-w-md px-4 py-20 text-center">
            <Suspense>
                <PaymentRedirectClient />
            </Suspense>
        </div>
    );
}
