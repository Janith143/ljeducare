import type { LiveClass } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import CommunicationsForm from '@/components/admin/communications/CommunicationsForm';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminCommunicationsPage() {
    await requirePermission('communications');

    const snap = await adminDb().collection(COLLECTIONS.CLASSES).where('isPublished', '==', true).get();
    const classes = snap.docs
        .map((d) => ({ id: d.id, title: (d.data() as LiveClass).title, deleted: (d.data() as LiveClass).isDeleted }))
        .filter((c) => !c.deleted)
        .map(({ id, title }) => ({ id, title }));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Communications</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Send an announcement to all students or those enrolled in a specific class. In-app
                messages appear in each student&apos;s notification bell instantly.
            </p>
            <CommunicationsForm classes={classes} />
        </div>
    );
}
