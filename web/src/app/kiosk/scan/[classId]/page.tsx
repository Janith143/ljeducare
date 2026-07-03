import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { LiveClass } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import KioskScanClient from '@/components/kiosk/KioskScanClient';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function KioskScanClassPage({
    params,
}: {
    params: Promise<{ classId: string }>;
}) {
    await requireRole('kiosk', 'main_admin');
    const { classId } = await params;

    const doc = await adminDb().collection(COLLECTIONS.CLASSES).doc(classId).get();
    if (!doc.exists || doc.data()!.isDeleted) notFound();
    const cls = { ...(doc.data() as LiveClass), id: doc.id };

    return (
        <div className="mx-auto max-w-2xl space-y-4 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">{cls.title}</h1>
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">
                        {cls.subject} · {cls.startTime}–{cls.endTime}
                    </p>
                </div>
                <Link href="/kiosk/scan" className="btn-secondary text-sm">
                    Change class
                </Link>
            </div>
            <KioskScanClient
                classId={cls.id}
                feeLabel={
                    cls.pricing?.isFree || !cls.pricing?.basePrice
                        ? 'Free class'
                        : `Fee: LKR ${cls.pricing.basePrice.toLocaleString()}`
                }
            />
        </div>
    );
}
