'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@ljeducare/shared';
import { setUserStatusAction } from '@/app/admin/users/actions';

const ROLES = ['all', 'student', 'teacher', 'teacher_admin', 'manager', 'main_admin', 'kiosk'];

export default function UsersTable({ users }: { users: User[] }) {
    const [roleFilter, setRoleFilter] = useState('all');
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return users.filter(
            (u) =>
                (roleFilter === 'all' || u.role === roleFilter) &&
                (!q ||
                    `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
                    u.email?.toLowerCase().includes(q) ||
                    u.contactNumber?.includes(q)),
        );
    }, [users, roleFilter, search]);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <input
                    placeholder="Search name / email / mobile"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input max-w-xs"
                />
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input max-w-40">
                    {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
                <span className="self-center text-sm text-light-subtle dark:text-dark-subtle">
                    {filtered.length} of {users.length}
                </span>
            </div>
            <div className="card overflow-x-auto p-0">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-light-border text-left dark:border-dark-border">
                            <th className="p-3">Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Mobile</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Status</th>
                            <th className="p-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.slice(0, 100).map((u) => (
                            <Row key={u.id} user={u} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Row({ user }: { user: User }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const suspended = user.status === 'suspended';

    function toggle() {
        startTransition(async () => {
            setError(null);
            const result = await setUserStatusAction(user.id, suspended ? 'active' : 'suspended');
            if (result.error) setError(result.error);
            else router.refresh();
        });
    }

    return (
        <tr className="border-b border-light-border dark:border-dark-border">
            <td className="p-3 font-medium">
                {user.firstName} {user.lastName}
                {error && <span className="block text-xs font-normal text-red-600">{error}</span>}
            </td>
            <td className="p-3 text-light-subtle dark:text-dark-subtle">{user.email}</td>
            <td className="p-3 text-light-subtle dark:text-dark-subtle">{user.contactNumber ?? '—'}</td>
            <td className="p-3">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{user.role}</span>
            </td>
            <td className="p-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${suspended ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'}`}>
                    {user.status}
                </span>
            </td>
            <td className="p-3 text-right">
                {user.role !== 'main_admin' && (
                    <button type="button" disabled={pending} onClick={toggle} className="btn-secondary px-2 py-1 text-xs">
                        {pending ? '…' : suspended ? 'Reactivate' : 'Suspend'}
                    </button>
                )}
            </td>
        </tr>
    );
}
