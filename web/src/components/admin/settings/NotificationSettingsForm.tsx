'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelFlags, NotificationSettings } from '@ljeducare/shared';
import { DEFAULT_NOTIFICATION_SETTINGS, channelsFor, classReminderConfig } from '@ljeducare/shared';
import { saveNotificationSettingsAction } from '@/app/admin/settings/actions';

const ROWS: { key: 'guardianAttendance' | 'payment' | 'teacherMessage'; label: string; help: string }[] = [
    {
        key: 'guardianAttendance',
        label: 'Attendance alert to guardian',
        help: 'Sent when a student is marked present (kiosk scan, bulk upload or manual).',
    },
    {
        key: 'payment',
        label: 'Payment receipt',
        help: 'Sent when a payment settles — gateway or approved bank slip. Goes to the student, and the guardian when one is on file.',
    },
    {
        key: 'teacherMessage',
        label: 'Teacher → their students',
        help: 'The channels teachers may use when messaging their own enrolled students.',
    },
];

/** Admin control over which channels each automatic message may use. */
export default function NotificationSettingsForm({ settings }: { settings: NotificationSettings }) {
    const router = useRouter();
    const [draft, setDraft] = useState<NotificationSettings>({
        guardianAttendance: channelsFor(settings, 'guardianAttendance'),
        payment: channelsFor(settings, 'payment'),
        teacherMessage: channelsFor(settings, 'teacherMessage'),
        classReminder: classReminderConfig(settings),
    });
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function setFlag(key: keyof NotificationSettings, ch: keyof ChannelFlags, on: boolean) {
        setDraft((d) => ({ ...d, [key]: { ...(d[key] as ChannelFlags), [ch]: on } }));
        setSaved(false);
    }

    async function save() {
        setBusy(true);
        setError(null);
        setSaved(false);
        const res = await saveNotificationSettingsAction(draft);
        setBusy(false);
        if (res.error) {
            setError(res.error);
            return;
        }
        setSaved(true);
        router.refresh();
    }

    const reminder = draft.classReminder ?? DEFAULT_NOTIFICATION_SETTINGS.classReminder;
    const smsOnAnywhere =
        (draft.guardianAttendance?.sms || draft.payment?.sms || draft.teacherMessage?.sms || reminder.sms) ?? false;

    const Check = ({
        on,
        onChange,
        label,
    }: {
        on: boolean | undefined;
        onChange: (v: boolean) => void;
        label: string;
    }) => (
        <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={!!on} onChange={(e) => onChange(e.target.checked)} />
            {label}
        </label>
    );

    return (
        <section className="card space-y-4 lg:col-span-2">
            <div>
                <h2 className="text-lg font-semibold">Notifications</h2>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Which channels each automatic message may use. In-app and email are free; each SMS costs credit.
                </p>
            </div>

            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}
            {saved && (
                <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                    Saved.
                </p>
            )}

            <div className="space-y-3">
                {ROWS.map((row) => {
                    const f = (draft[row.key] ?? {}) as ChannelFlags;
                    return (
                        <div key={row.key} className="rounded-lg border border-light-border p-3 dark:border-dark-border">
                            <p className="text-sm font-medium">{row.label}</p>
                            <p className="mb-2 text-xs text-light-subtle dark:text-dark-subtle">{row.help}</p>
                            <div className="flex flex-wrap gap-4">
                                <Check on={f.inApp} label="In-app" onChange={(v) => setFlag(row.key, 'inApp', v)} />
                                <Check on={f.email} label="Email" onChange={(v) => setFlag(row.key, 'email', v)} />
                                <Check on={f.sms} label="SMS" onChange={(v) => setFlag(row.key, 'sms', v)} />
                            </div>
                        </div>
                    );
                })}

                {/* Class reminder has scheduling as well as channels. */}
                <div className="rounded-lg border border-light-border p-3 dark:border-dark-border">
                    <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                            type="checkbox"
                            checked={reminder.enabled !== false}
                            onChange={(e) =>
                                setDraft((d) => ({ ...d, classReminder: { ...reminder, enabled: e.target.checked } }))
                            }
                        />
                        Class starting reminder
                    </label>
                    <p className="mb-2 text-xs text-light-subtle dark:text-dark-subtle">
                        Sent to students enrolled in the class. Checked every 5 minutes against Sri Lanka time.
                    </p>
                    <div className="mb-3 flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-xs">
                            Remind
                            <input
                                type="number"
                                min={0}
                                max={720}
                                className="input w-20 py-1 text-xs"
                                value={reminder.leadMinutes ?? 30}
                                onChange={(e) =>
                                    setDraft((d) => ({
                                        ...d,
                                        classReminder: { ...reminder, leadMinutes: Number(e.target.value) },
                                    }))
                                }
                            />
                            minutes before (0 = off)
                        </label>
                        <Check
                            on={reminder.alsoAtStart !== false}
                            label="Also at start time"
                            onChange={(v) => setDraft((d) => ({ ...d, classReminder: { ...reminder, alsoAtStart: v } }))}
                        />
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <Check on={reminder.inApp} label="In-app" onChange={(v) => setFlag('classReminder', 'inApp', v)} />
                        <Check on={reminder.email} label="Email" onChange={(v) => setFlag('classReminder', 'email', v)} />
                        <Check on={reminder.sms} label="SMS" onChange={(v) => setFlag('classReminder', 'sms', v)} />
                    </div>
                </div>
            </div>

            {smsOnAnywhere && (
                <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <strong>SMS is on.</strong> Every message costs a credit, and a class reminder sends one per
                    enrolled student per session. Check your Notify.lk balance and that your sender ID is approved —
                    the demo sender only delivers to numbers registered on your account.
                </p>
            )}

            <button type="button" onClick={save} disabled={busy} className="btn-primary">
                {busy ? 'Saving…' : 'Save notifications'}
            </button>
        </section>
    );
}
