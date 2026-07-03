'use client';

import { useState, useTransition } from 'react';
import type { Permission, Role, User } from '@ljeducare/shared';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, MAIN_ADMIN_ONLY } from '@ljeducare/shared';
import { updateRolePermsAction } from '@/app/admin/staff/actions';

const DELEGATABLE = ALL_PERMISSIONS.filter((p) => !MAIN_ADMIN_ONLY.includes(p));

/** Roles & delegated-permissions editor (ports the source Staff tab pattern). */
export default function StaffRolesTable({ users }: { users: User[] }) {
    const [editing, setEditing] = useState<string | null>(null);

    return (
        <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-light-border text-left dark:border-dark-border">
                        <th className="p-3">Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Permissions</th>
                        <th className="p-3" />
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <RoleRow key={u.id} user={u} open={editing === u.id} onToggle={() => setEditing(editing === u.id ? null : u.id)} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function RoleRow({ user, open, onToggle }: { user: User; open: boolean; onToggle: () => void }) {
    const [pending, startTransition] = useTransition();
    const [role, setRole] = useState<Role>(user.role);
    const [perms, setPerms] = useState<Permission[]>(
        user.permissions ?? DEFAULT_ROLE_PERMISSIONS[user.role] ?? [],
    );
    const isMainAdmin = user.role === 'main_admin';
    const delegatable = role === 'manager' || role === 'teacher_admin';

    function save() {
        startTransition(async () => {
            await updateRolePermsAction(user.id, role, perms);
            onToggle();
        });
    }

    return (
        <>
            <tr className="border-b border-light-border dark:border-dark-border">
                <td className="p-3 font-medium">{user.firstName} {user.lastName}</td>
                <td className="p-3 text-light-subtle dark:text-dark-subtle">{user.email}</td>
                <td className="p-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {user.role}
                    </span>
                </td>
                <td className="p-3 text-xs text-light-subtle dark:text-dark-subtle">
                    {isMainAdmin ? 'All permissions' : (user.permissions?.length ? `${user.permissions.length} delegated` : 'Role default')}
                </td>
                <td className="p-3 text-right">
                    {!isMainAdmin && (
                        <button type="button" onClick={onToggle} className="btn-secondary px-2 py-1 text-xs">
                            {open ? 'Close' : 'Edit'}
                        </button>
                    )}
                </td>
            </tr>
            {open && !isMainAdmin && (
                <tr className="border-b border-light-border bg-light-background dark:border-dark-border dark:bg-dark-background">
                    <td colSpan={5} className="space-y-3 p-4">
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
                                <option value="teacher">teacher</option>
                                <option value="teacher_admin">teacher_admin</option>
                                <option value="manager">manager</option>
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
                                                    setPerms((prev) =>
                                                        e.target.checked ? [...prev, p] : prev.filter((x) => x !== p),
                                                    )
                                                }
                                            />
                                            {p}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        )}
                        <button type="button" onClick={save} disabled={pending} className="btn-primary px-4 py-1.5 text-sm">
                            {pending ? 'Saving…' : 'Save'}
                        </button>
                    </td>
                </tr>
            )}
        </>
    );
}
