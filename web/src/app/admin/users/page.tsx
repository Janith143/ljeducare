import UsersTable from '@/components/admin/users/UsersTable';
import { requirePermission } from '@/lib/auth/session';
import { listAllUsers } from '@/lib/data/adminStats';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
    await requirePermission('users');
    const users = await listAllUsers();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Users</h1>
            <UsersTable users={users} />
        </div>
    );
}
