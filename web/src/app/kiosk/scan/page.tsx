import Link from 'next/link';
import type { LiveClass } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/** Class picker — kiosk selects which session it is scanning for. */
export default async function KioskScanIndexPage() {
    await requireRole('kiosk', 'main_admin');

    const snap = await adminDb()
        .collection(COLLECTIONS.CLASSES)
        .where('status', '==', 'scheduled')
        .get();
    const classes = snap.docs
        .map((d) => ({ ...(d.data() as LiveClass), id: d.id }))
        .filter((c) => !c.isDeleted && c.isPublished)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
        <div className="mx-auto max-w-2xl space-y-6 p-6">
            <h1 className="text-2xl font-bold">Select a class to scan</h1>
            {classes.length ? (
                <div className="space-y-3">
                    {classes.map((cls) => (
                        <Link
                            key={cls.id}
                            href={`/kiosk/scan/${cls.id}`}
                            className="card flex items-center justify-between transition-shadow hover:shadow-md"
                        >
                            <span>
                                <span className="block font-semibold">{cls.title}</span>
                                <span className="text-sm text-light-subtle dark:text-dark-subtle">
                                    {cls.subject} · {cls.recurrence === 'weekly' ? 'Weekly' : cls.date} ·{' '}
                                    {cls.startTime}–{cls.endTime}
                                </span>
                            </span>
                            <span className="btn-primary px-4 py-2 text-sm">Scan →</span>
                        </Link>
                    ))}
                </div>
            ) : (
                <p className="card text-light-subtle dark:text-dark-subtle">No scheduled classes.</p>
            )}
        </div>
    );
}
