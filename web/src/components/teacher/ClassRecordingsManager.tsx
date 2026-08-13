'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Video } from 'lucide-react';
import { addClassRecordingAction, removeClassRecordingAction } from '@/app/teacher/classes/actions';

/** Local (not UTC) YYYY-MM-DD — the teacher means their own calendar day. */
function todayLocal(): string {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * Attach session recordings to a class, one or more links per session date.
 * Saves into classes/{id}.recordingUrls[date] — the same field the Zoom webhook
 * fills automatically — so students reach these from My Classes and watch them in
 * the secure player, with the class's view-cap and expiry rules applied.
 */
export default function ClassRecordingsManager({
    classId,
    recordings,
}: {
    classId: string;
    recordings: Record<string, string[]>;
}) {
    const router = useRouter();
    const [date, setDate] = useState('');
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    // Set on the client to avoid an SSR/client hydration mismatch on the date.
    useEffect(() => setDate(todayLocal()), []);

    const dates = Object.keys(recordings).sort((a, b) => b.localeCompare(a));
    const total = dates.reduce((n, d) => n + recordings[d].length, 0);

    function add() {
        setError(null);
        startTransition(async () => {
            const res = await addClassRecordingAction(classId, date, url);
            if (res.error) {
                setError(res.error);
                return;
            }
            setUrl('');
            router.refresh();
        });
    }

    function remove(d: string, link: string) {
        setError(null);
        startTransition(async () => {
            const res = await removeClassRecordingAction(classId, d, link);
            if (res.error) {
                setError(res.error);
                return;
            }
            router.refresh();
        });
    }

    return (
        <section className="card space-y-4">
            <div>
                <h2 className="font-semibold">Session recordings ({total})</h2>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Add the recording for a session date. Enrolled students watch it in the protected player —
                    they can&apos;t download it or open it on YouTube.
                </p>
            </div>

            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}

            <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Session date</span>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="input"
                    />
                </label>
                <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm">
                    <span className="font-medium">Recording link</span>
                    <input
                        type="url"
                        value={url}
                        placeholder="https://www.youtube.com/watch?v=…  (unlisted)"
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && url.trim() && !pending) add();
                        }}
                        className="input"
                    />
                </label>
                <button type="button" onClick={add} disabled={pending || !url.trim() || !date} className="btn-primary">
                    {pending ? 'Saving…' : 'Add recording'}
                </button>
            </div>
            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                YouTube (unlisted recommended) or a direct .mp4 / .webm / .m3u8 link. Add several for a
                session split into parts.
            </p>

            {total === 0 ? (
                <p className="text-sm text-light-subtle dark:text-dark-subtle">No recordings added yet.</p>
            ) : (
                <div className="space-y-3 border-t border-light-border pt-3 dark:border-dark-border">
                    {dates.map((d) => (
                        <div key={d} className="space-y-1">
                            <p className="text-xs font-semibold text-light-subtle dark:text-dark-subtle">
                                {d}
                                {recordings[d].length > 1 ? ` · ${recordings[d].length} parts` : ''}
                            </p>
                            <ul className="divide-y divide-light-border text-sm dark:divide-dark-border">
                                {recordings[d].map((link) => (
                                    <li key={link} className="flex items-center justify-between gap-3 py-1.5">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <Video className="h-4 w-4 shrink-0 text-light-subtle dark:text-dark-subtle" />
                                            <span className="truncate font-mono text-xs">{link}</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => remove(d, link)}
                                            disabled={pending}
                                            aria-label={`Remove recording for ${d}`}
                                            className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
