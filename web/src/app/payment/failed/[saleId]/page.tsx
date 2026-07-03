import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PaymentFailedPage({
    params,
}: {
    params: Promise<{ saleId: string }>;
}) {
    const { saleId } = await params;
    return (
        <div className="mx-auto max-w-md space-y-6 px-4 py-20 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">✕</span>
            <h1 className="text-2xl font-bold">Payment not completed</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Your payment was canceled or could not be confirmed. No money was taken for
                reference <span className="font-mono">{saleId}</span> — you can safely try again.
            </p>
            <div className="flex justify-center gap-3">
                <Link href="/classes" className="btn-primary">Try again</Link>
                <Link href="/student" className="btn-secondary">My Dashboard</Link>
            </div>
        </div>
    );
}
