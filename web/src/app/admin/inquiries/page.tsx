import Link from 'next/link';
import type { LandingInquiry, NewsletterSubscriber } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import InquiriesTable from '@/components/admin/landing/InquiriesTable';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Inquiries' };

/** Newest first, capped — the landing forms are low-volume but unbounded. */
const LIMIT = 300;

export default async function AdminInquiriesPage() {
    await requirePermission('landing_page');
    const db = adminDb();
    const [inqSnap, subSnap] = await Promise.all([
        db.collection(COLLECTIONS.LANDING_INQUIRIES).orderBy('createdAt', 'desc').limit(LIMIT).get(),
        db.collection(COLLECTIONS.NEWSLETTER_SUBSCRIBERS).orderBy('createdAt', 'desc').limit(LIMIT).get(),
    ]);

    const inquiries = inqSnap.docs.map((d) => ({ ...(d.data() as LandingInquiry), id: d.id }));
    const subscribers = subSnap.docs
        .map((d) => ({ ...(d.data() as NewsletterSubscriber), id: d.id }))
        .filter((s) => !s.unsubscribedAt);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Inquiries</h1>
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">
                        Messages and newsletter sign-ups from the landing page.
                    </p>
                </div>
                <Link href="/admin/landing-page" className="shrink-0 btn-secondary text-sm">
                    Edit landing page
                </Link>
            </div>

            <InquiriesTable inquiries={inquiries} subscribers={subscribers} />
        </div>
    );
}
