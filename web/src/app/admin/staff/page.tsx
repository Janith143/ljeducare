import Link from 'next/link';
import { requirePermission } from '@/lib/auth/session';
import { listStaff, listStaffUsers } from '@/lib/data/staff';
import StaffCreateForm from '@/components/admin/staff/StaffCreateForm';
import StaffProfilesTable from '@/components/admin/staff/StaffProfilesTable';

export const dynamic = 'force-dynamic';

export default async function AdminStaffPage() {
    await requirePermission('staff');
    const [staff, users] = await Promise.all([listStaff(), listStaffUsers()]);
    // Managers and teacher admins hold classes too, so the roster mixes roles — label
    // each row rather than leaving every profile looking like a plain teacher.
    const roleByUserId: Record<string, string> = {};
    users.forEach((u) => {
        if (u.id) roleByUserId[u.id] = u.role;
    });

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Staff</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Roles &amp; permissions for existing accounts are managed by the main admin under{' '}
                <Link href="/admin/users" className="text-primary hover:underline">Users → Manage access</Link>.
            </p>
            <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
                <StaffCreateForm />
                <section className="space-y-2">
                    <h2 className="font-semibold">Staff profiles</h2>
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">
                        Everyone who can be assigned to a class or course — teachers, teacher admins and
                        managers. Commission is worked out per person from the rate set here.
                    </p>
                    <StaffProfilesTable staff={staff} roleByUserId={roleByUserId} />
                </section>
            </div>
        </div>
    );
}
