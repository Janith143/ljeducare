import type { Metadata } from 'next';
import VerifyLookupForm from '@/components/verify/VerifyLookupForm';

export const metadata: Metadata = { title: 'Verify a Certificate' };

export default function VerifyIndexPage() {
    return (
        <div className="mx-auto max-w-md space-y-6 px-4 py-16 text-center">
            <h1 className="text-2xl font-bold">Verify a Certificate</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Enter the certificate ID printed on the document (e.g. LJC-A2B3-C4D5).
            </p>
            <VerifyLookupForm />
        </div>
    );
}
