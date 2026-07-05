import UsersTable from '@/components/admin/users/UsersTable';
import { requirePermission } from '@/lib/auth/session';
import { listAllUsers } from '@/lib/data/adminStats';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
    const admin = await requirePermission('users');
    const users = await listAllUsers();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Users</h1>
                {admin.role === 'main_admin' && (
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">
                        As main admin you can grant roles and permissions with “Manage access”.
                    </p>
                )}
            </div>
            <UsersTable users={users} canManageAccess={admin.role === 'main_admin'} />
        </div>
    );
}
