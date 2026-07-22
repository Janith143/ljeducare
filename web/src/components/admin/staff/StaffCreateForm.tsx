'use client';

import { useState, useTransition } from 'react';
import type { Role } from '@ljeducare/shared';
import { isTeachingRole } from '@ljeducare/shared';
import { createStaffAction } from '@/app/admin/staff/actions';

const ROLE_OPTIONS: { value: Role; label: string; hint: string }[] = [
    { value: 'teacher', label: 'Teacher', hint: 'Teaches classes/courses; has a public bio page.' },
    { value: 'teacher_admin', label: 'Teacher Admin', hint: 'Teacher + manages other teachers and their content.' },
    { value: 'manager', label: 'Manager', hint: 'Day-to-day operations, and may teach their own classes.' },
];

export default function StaffCreateForm() {
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ ok?: boolean; text: string } | null>(null);
    const [role, setRole] = useState<Role>('teacher');

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const form = e.currentTarget;
        startTransition(async () => {
            const result = await createStaffAction({
                firstName: String(data.get('firstName') ?? ''),
                lastName: String(data.get('lastName') ?? ''),
                email: String(data.get('email') ?? ''),
                password: String(data.get('password') ?? ''),
                role,
                commissionRate: Number(data.get('commissionRate') ?? 0),
                subjects: String(data.get('subjects') ?? ''),
            });
            if (result.error) setMessage({ text: result.error });
            else {
                setMessage({ ok: true, text: 'Staff member created.' });
                form.reset();
            }
        });
    }

    // Managers teach too, so they also get a staff profile and a commission rate.
    const teaching = isTeachingRole(role);

    return (
        <form onSubmit={handleSubmit} className="card space-y-3">
            <h2 className="font-semibold">Add staff member</h2>
            {message && (
                <p role="status" className={`rounded-lg p-2 text-sm ${message.ok ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
                    {message.text}
                </p>
            )}
            <div className="grid grid-cols-2 gap-3">
                <input name="firstName" required placeholder="First name" className="input" />
                <input name="lastName" required placeholder="Last name" className="input" />
            </div>
            <input name="email" type="email" required placeholder="Email (login)" className="input" />
            <input name="password" type="password" required minLength={8} placeholder="Temporary password (8+ chars)" className="input" />
            <label className="block">
                <span className="mb-1 block text-sm font-medium">Role</span>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input">
                    {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
                <span className="mt-1 block text-xs text-light-subtle dark:text-dark-subtle">
                    {ROLE_OPTIONS.find((r) => r.value === role)?.hint}
                </span>
            </label>
            {teaching && (
                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium">Commission %</span>
                        <input name="commissionRate" type="number" min={0} max={100} defaultValue={40} className="input" />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium">Subjects</span>
                        <input name="subjects" placeholder="Physics, Maths" className="input" />
                    </label>
                </div>
            )}
            <button type="submit" disabled={pending} className="btn-primary w-full">
                {pending ? 'Creating…' : 'Create staff member'}
            </button>
        </form>
    );
}
