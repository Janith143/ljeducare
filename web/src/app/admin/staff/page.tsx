import { requirePermission } from '@/lib/auth/session';
import { listStaff, listStaffUsers } from '@/lib/data/staff';
import StaffCreateForm from '@/components/admin/staff/StaffCreateForm';
import StaffProfilesTable from '@/components/admin/staff/StaffProfilesTable';
import StaffRolesTable from '@/components/admin/staff/StaffRolesTable';

export const dynamic = 'force-dynamic';

export default async function AdminStaffPage() {
    await requirePermission('staff');
    const [staff, users] = await Promise.all([listStaff(), listStaffUsers()]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Staff</h1>
            <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
                <StaffCreateForm />
                <div className="space-y-6">
                    <section className="space-y-2">
                        <h2 className="font-semibold">Roles &amp; permissions</h2>
                        <StaffRolesTable users={users} />
                    </section>
                    <section className="space-y-2">
                        <h2 className="font-semibold">Teacher profiles</h2>
                        <StaffProfilesTable staff={staff} />
                    </section>
                </div>
            </div>
        </div>
    );
}
