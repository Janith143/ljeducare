'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Permission, Role, User } from '@ljeducare/shared';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, MAIN_ADMIN_ONLY } from '@ljeducare/shared';
import { setUserStatusAction, updateUserAccessAction } from '@/app/admin/users/actions';

const ROLES = ['all', 'student', 'teacher', 'teacher_admin', 'manager', 'main_admin', 'kiosk'];
const ASSIGNABLE: Role[] = ['student', 'teacher', 'teacher_admin', 'manager'];
const DELEGATABLE = ALL_PERMISSIONS.filter((p) => !MAIN_ADMIN_ONLY.includes(p));

export default function UsersTable({ users, canManageAccess = false }: { users: User[]; canManageAccess?: boolean }) {
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
                            <Row key={u.id} user={u} canManageAccess={canManageAccess} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Row({ user, canManageAccess }: { user: User; canManageAccess: boolean }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const suspended = user.status === 'suspended';
    const isMainAdmin = user.role === 'main_admin';
    const canEdit = canManageAccess && !isMainAdmin;

    function toggleSuspend() {
        startTransition(async () => {
            setError(null);
            const result = await setUserStatusAction(user.id, suspended ? 'active' : 'suspended');
            if (result.error) setError(result.error);
            else router.refresh();
        });
    }

    return (
        <>
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
                <td className="whitespace-nowrap p-3 text-right">
                    {canEdit && (
                        <button type="button" onClick={() => setEditing((v) => !v)} className="btn-secondary mr-2 px-2 py-1 text-xs">
                            {editing ? 'Close' : 'Manage access'}
                        </button>
                    )}
                    {!isMainAdmin && (
                        <button type="button" disabled={pending} onClick={toggleSuspend} className="btn-secondary px-2 py-1 text-xs">
                            {pending ? '…' : suspended ? 'Reactivate' : 'Suspend'}
                        </button>
                    )}
                </td>
            </tr>
            {editing && canEdit && (
                <AccessEditor user={user} onDone={() => { setEditing(false); router.refresh(); }} />
            )}
        </>
    );
}

function AccessEditor({ user, onDone }: { user: User; onDone: () => void }) {
    const [pending, startTransition] = useTransition();
    const [role, setRole] = useState<Role>(ASSIGNABLE.includes(user.role) ? user.role : 'student');
    const [perms, setPerms] = useState<Permission[]>(user.permissions ?? DEFAULT_ROLE_PERMISSIONS[user.role] ?? []);
    const [error, setError] = useState<string | null>(null);
    const delegatable = role === 'manager' || role === 'teacher_admin';

    function save() {
        setError(null);
        startTransition(async () => {
            const res = await updateUserAccessAction(user.id, role, perms);
            if (res?.error) setError(res.error);
            else onDone();
        });
    }

    return (
        <tr className="border-b border-light-border bg-light-bg dark:border-dark-border dark:bg-dark-bg">
            <td colSpan={6} className="space-y-3 p-4">
                {error && <p className="text-xs text-red-600">{error}</p>}
                <label className="block max-w-xs">
                    <span className="mb-1 block text-xs font-medium">Role</span>
                    <select
                        value={role}
                        onChange={(e) => {
                            const next = e.target.value as Role;
                            setRole(next);
                            setPerms(DEFAULT_ROLE_PERMISSIONS[next] ?? []);
                        }}
                        className="input"
                    >
                        {ASSIGNABLE.map((r) => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </label>

                {delegatable && (
                    <fieldset>
                        <legend className="mb-1 text-xs font-medium">Delegated permissions</legend>
                        <div className="flex flex-wrap gap-2">
                            {DELEGATABLE.map((p) => (
                                <label key={p} className="flex items-center gap-1 rounded-lg border border-light-border px-2 py-1 text-xs dark:border-dark-border">
                                    <input
                                        type="checkbox"
                                        checked={perms.includes(p)}
                                        onChange={(e) =>
                                            setPerms((prev) => (e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)))
                                        }
                                    />
                                    {p}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                )}

                <p className="text-xs text-light-subtle dark:text-dark-subtle">
                    Saving signs this user out — the new access applies the next time they log in.
                </p>
                <button type="button" onClick={save} disabled={pending} className="btn-primary px-4 py-1.5 text-sm">
                    {pending ? 'Saving…' : 'Save access'}
                </button>
            </td>
        </tr>
    );
}
