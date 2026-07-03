import { COLLECTIONS } from '@ljeducare/shared';
import SlipApprovalTable from '@/components/admin/requests/SlipApprovalTable';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminRequestsPage() {
    await requirePermission('requests');

    const snap = await adminDb()
        .collection(COLLECTIONS.SALES)
        .where('status', '==', 'pending_slip')
        .get();
    const pending = snap.docs
        .map((d) => d.data())
        .sort((a, b) => (b.saleDate ?? '').localeCompare(a.saleDate ?? ''))
        .map((s) => ({
            id: s.id as string,
            itemName: s.itemName as string,
            amount: s.amount as number,
            currency: s.currency as string,
            saleDate: s.saleDate as string,
            slipImageUrl: (s.slipImageUrl as string) ?? null,
            studentName: (s.studentSnapshot?.name as string) ?? s.studentId,
            studentContact: (s.studentSnapshot?.contactNumber as string) ?? '',
        }));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Payment Requests</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Bank-transfer slips awaiting verification. Approving a slip enrolls the student
                immediately and records the sale.
            </p>
            <SlipApprovalTable pending={pending} />
        </div>
    );
}
