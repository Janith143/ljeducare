'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { callFunction } from '@/lib/firebase/client';

/** Captures the PayPal order on return, then routes to success/failed. */
export default function PaymentRedirectClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [message, setMessage] = useState('Confirming your payment…');
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        const saleId = searchParams.get('saleId');
        if (!saleId) {
            setMessage('Missing payment reference.');
            return;
        }
        (async () => {
            try {
                await callFunction<{ saleId: string }, { success: boolean }>('paypalCaptureOrder', { saleId });
                router.replace(`/payment/success/${saleId}`);
            } catch {
                router.replace(`/payment/failed/${saleId}`);
            }
        })();
    }, [router, searchParams]);

    return (
        <div className="space-y-4">
            <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="font-medium">{message}</p>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Please don&apos;t close this window.
            </p>
        </div>
    );
}
