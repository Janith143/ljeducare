'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { StaffMember } from '@ljeducare/shared';
import { removeStaffAction, setCommissionAction } from '@/app/admin/staff/actions';

const ROLE_LABEL: Record<string, string> = {
    teacher: 'Teacher',
    teacher_admin: 'Teacher Admin',
    manager: 'Manager',
};

/** Staff profiles (teachers, teacher admins, managers) with inline commission editing. */
export default function StaffProfilesTable({
    staff,
    roleByUserId = {},
}: {
    staff: StaffMember[];
    /** Account role per linked user, so a manager isn't shown as a plain teacher. */
    roleByUserId?: Record<string, string>;
}) {
    if (!staff.length) {
        return <p className="card text-sm text-light-subtle dark:text-dark-subtle">No staff profiles yet.</p>;
    }
    return (
        <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-light-border text-left dark:border-dark-border">
                        <th className="p-3">Name</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Subjects</th>
                        <th className="p-3">Commission %</th>
                        <th className="p-3">Cash balance (LKR)</th>
                        <th className="p-3">Published</th>
                        <th className="p-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {staff.map((s) => (
                        <ProfileRow
                            key={s.id}
                            member={s}
                            role={(s.userId && roleByUserId[s.userId]) || ''}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ProfileRow({ member, role }: { member: StaffMember; role: string }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [removing, startRemoving] = useTransition();
    const [rate, setRate] = useState(member.commissionRate);
    const [error, setError] = useState<string | null>(null);
    const dirty = rate !== member.commissionRate;
    const balance = member.manualBalance ?? 0;

    function remove() {
        const balanceNote =
            balance !== 0
                ? `\n\nNote: this teacher has an outstanding cash balance of LKR ${balance.toLocaleString()} — settle it under Revenue first if needed.`
                : '';
        if (
            !confirm(
                `Remove ${member.name} from staff?\n\nThis hides their teacher profile and disables their login. Their existing classes, courses and sales stay intact, and you can reactivate the account later under Users.${balanceNote}`,
            )
        )
            return;
        setError(null);
        startRemoving(async () => {
            const res = await removeStaffAction(member.id);
            if (res.error) setError(res.error);
            else router.refresh();
        });
    }

    return (
        <tr className="border-b border-light-border dark:border-dark-border">
            <td className="p-3 font-medium">{member.name}</td>
            <td className="p-3">
                <span className="rounded-full bg-light-background px-2 py-0.5 text-xs font-medium text-light-subtle dark:bg-dark-background dark:text-dark-subtle">
                    {ROLE_LABEL[role] ?? 'No account'}
                </span>
            </td>
            <td className="p-3 text-light-subtle dark:text-dark-subtle">{member.subjects.join(', ') || '—'}</td>
            <td className="p-3">
                <span className="flex items-center gap-2">
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={rate}
                        onChange={(e) => setRate(Number(e.target.value))}
                        className="input w-20 py-1"
                    />
                    {dirty && (
                        <button
                            type="button"
                            disabled={pending}
                            onClick={() => startTransition(async () => void (await setCommissionAction(member.id, rate)))}
                            className="btn-primary px-2 py-1 text-xs"
                        >
                            {pending ? '…' : 'Save'}
                        </button>
                    )}
                </span>
            </td>
            <td className="p-3">{balance.toLocaleString()}</td>
            <td className="p-3">{member.isPublished ? 'Yes' : 'No'}</td>
            <td className="p-3 text-right">
                <button
                    type="button"
                    disabled={removing}
                    onClick={remove}
                    className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                    {removing ? 'Removing…' : 'Remove'}
                </button>
                {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </td>
        </tr>
    );
}
