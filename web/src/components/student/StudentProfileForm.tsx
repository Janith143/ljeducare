'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateStudentProfileAction, type StudentProfileInput } from '@/app/student/profile/actions';

export default function StudentProfileForm({
    initial,
    currencies,
}: {
    initial: StudentProfileInput;
    currencies: string[];
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ ok?: boolean; text: string } | null>(null);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        startTransition(async () => {
            setMessage(null);
            const result = await updateStudentProfileAction({
                firstName: String(f.get('firstName') ?? ''),
                lastName: String(f.get('lastName') ?? ''),
                contactNumber: String(f.get('contactNumber') ?? ''),
                guardianPhone: String(f.get('guardianPhone') ?? ''),
                guardianEmail: String(f.get('guardianEmail') ?? ''),
                school: String(f.get('school') ?? ''),
                preferredCurrency: String(f.get('preferredCurrency') ?? 'LKR'),
            });
            if (result.error) setMessage({ text: result.error });
            else {
                setMessage({ ok: true, text: 'Profile saved.' });
                router.refresh();
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="card space-y-3">
            {message && (
                <p role="status" className={`rounded-lg p-2 text-sm ${message.ok ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
                    {message.text}
                </p>
            )}
            <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                    <span className="mb-1 block text-light-subtle dark:text-dark-subtle">First name</span>
                    <input name="firstName" required defaultValue={initial.firstName} className="input" />
                </label>
                <label className="block text-sm">
                    <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Last name</span>
                    <input name="lastName" required defaultValue={initial.lastName} className="input" />
                </label>
            </div>
            <label className="block text-sm">
                <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Mobile number</span>
                <input name="contactNumber" defaultValue={initial.contactNumber} placeholder="07XXXXXXXX" className="input" />
            </label>
            <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                    <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Guardian phone</span>
                    <input name="guardianPhone" defaultValue={initial.guardianPhone} className="input" />
                </label>
                <label className="block text-sm">
                    <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Guardian email</span>
                    <input name="guardianEmail" type="email" defaultValue={initial.guardianEmail} className="input" />
                </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                    <span className="mb-1 block text-light-subtle dark:text-dark-subtle">School</span>
                    <input name="school" defaultValue={initial.school} className="input" />
                </label>
                <label className="block text-sm">
                    <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Preferred currency</span>
                    <select name="preferredCurrency" defaultValue={initial.preferredCurrency} className="input">
                        {currencies.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </label>
            </div>
            <button type="submit" disabled={pending} className="btn-primary">
                {pending ? 'Saving…' : 'Save profile'}
            </button>
        </form>
    );
}
