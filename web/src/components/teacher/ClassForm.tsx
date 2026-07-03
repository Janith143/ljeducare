'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { LiveClass } from '@ljeducare/shared';
import { saveClassAction, type ClassFormInput } from '@/app/teacher/classes/actions';

/** Create/edit form for a live class (ported ScheduleClassModal essentials). */
export default function ClassForm({ existing }: { existing?: LiveClass }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [isFree, setIsFree] = useState(existing?.pricing?.isFree ?? false);
    const [recurrence, setRecurrence] = useState(existing?.recurrence ?? 'weekly');

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const input: ClassFormInput = {
            id: existing?.id,
            title: String(f.get('title') ?? ''),
            subject: String(f.get('subject') ?? ''),
            description: String(f.get('description') ?? ''),
            date: String(f.get('date') ?? ''),
            startTime: String(f.get('startTime') ?? ''),
            endTime: String(f.get('endTime') ?? ''),
            isFree,
            basePrice: Number(f.get('basePrice') ?? 0),
            usdOverride: f.get('usdOverride') ? Number(f.get('usdOverride')) : null,
            targetAudience: String(f.get('targetAudience') ?? ''),
            mode: String(f.get('mode') ?? 'Online') as ClassFormInput['mode'],
            recurrence,
            weeklyPaymentOption: String(f.get('weeklyPaymentOption') ?? 'per_month') as 'per_session' | 'per_month',
            medium: String(f.get('medium') ?? ''),
            grade: String(f.get('grade') ?? ''),
            category: String(f.get('category') ?? ''),
            joiningLink: String(f.get('joiningLink') ?? ''),
            recordingMaxViews: Number(f.get('recordingMaxViews') ?? 0),
            recordingExpiryDays: Number(f.get('recordingExpiryDays') ?? 60),
        };
        startTransition(async () => {
            const result = await saveClassAction(input);
            if (result.error) setError(result.error);
            else {
                router.push('/teacher/classes');
                router.refresh();
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}

            <section className="card space-y-3">
                <h2 className="font-semibold">Class details</h2>
                <input name="title" required placeholder="Class title" defaultValue={existing?.title} className="input" />
                <div className="grid grid-cols-2 gap-3">
                    <input name="subject" required placeholder="Subject" defaultValue={existing?.subject} className="input" />
                    <input name="targetAudience" required placeholder="Audience (e.g. A/L 2026)" defaultValue={existing?.targetAudience} className="input" />
                </div>
                <textarea name="description" rows={4} placeholder="Description" defaultValue={existing?.description} className="input" />
                <div className="grid grid-cols-3 gap-3">
                    <select name="mode" defaultValue={existing?.mode ?? 'Online'} className="input">
                        <option>Online</option>
                        <option>Physical</option>
                        <option>Both</option>
                    </select>
                    <input name="medium" placeholder="Medium (Sinhala…)" defaultValue={existing?.medium} className="input" />
                    <input name="grade" placeholder="Grade" defaultValue={existing?.grade} className="input" />
                </div>
                <input name="category" placeholder="Category (optional, e.g. Theory / Revision)" defaultValue={existing?.category} className="input" />
            </section>

            <section className="card space-y-3">
                <h2 className="font-semibold">Schedule</h2>
                <div className="grid grid-cols-3 gap-3">
                    <label className="block text-sm">
                        <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Date (first session)</span>
                        <input name="date" type="date" required defaultValue={existing?.date} className="input" />
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Starts</span>
                        <input name="startTime" type="time" required defaultValue={existing?.startTime} className="input" />
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Ends</span>
                        <input name="endTime" type="time" required defaultValue={existing?.endTime} className="input" />
                    </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as typeof recurrence)} className="input">
                        <option value="none">One-off class</option>
                        <option value="weekly">Weekly class</option>
                    </select>
                    {recurrence === 'weekly' && (
                        <select name="weeklyPaymentOption" defaultValue={existing?.weeklyPaymentOption ?? 'per_month'} className="input">
                            <option value="per_month">Students pay monthly</option>
                            <option value="per_session">Students pay per session</option>
                        </select>
                    )}
                </div>
                <input name="joiningLink" type="url" placeholder="Meeting link (Zoom/Meet URL — optional)" defaultValue={existing?.joiningLink} className="input" />
            </section>

            <section className="card space-y-3">
                <h2 className="font-semibold">Pricing</h2>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
                    This class is free
                </label>
                {!isFree && (
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm">
                            <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Fee (LKR)</span>
                            <input name="basePrice" type="number" min={0} step="0.01" defaultValue={existing?.pricing?.basePrice || ''} className="input" />
                        </label>
                        <label className="block text-sm">
                            <span className="mb-1 block text-light-subtle dark:text-dark-subtle">USD price (optional override)</span>
                            <input name="usdOverride" type="number" min={0} step="0.01" defaultValue={existing?.pricing?.overrides?.USD || ''} className="input" />
                        </label>
                    </div>
                )}
            </section>

            <section className="card space-y-3">
                <h2 className="font-semibold">Recordings</h2>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                        <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Max views per student (0 = unlimited)</span>
                        <input name="recordingMaxViews" type="number" min={0} defaultValue={existing?.recordingMaxViews ?? 0} className="input" />
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1 block text-light-subtle dark:text-dark-subtle">Expiry</span>
                        <select name="recordingExpiryDays" defaultValue={existing?.recordingExpiryDays ?? 60} className="input">
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                            <option value={60}>60 days</option>
                            <option value={0}>Never</option>
                        </select>
                    </label>
                </div>
            </section>

            <button type="submit" disabled={pending} className="btn-primary w-full py-3">
                {pending ? 'Saving…' : existing ? 'Save changes' : 'Create class'}
            </button>
        </form>
    );
}
