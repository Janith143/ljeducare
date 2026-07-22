'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { callFunction } from '@/lib/firebase/client';
import { clearZoomMeetingAction, saveZoomMeetingAction } from '@/app/teacher/classes/zoomActions';

export interface ZoomMeetingInfo {
    classId: string;
    staffId: string | null;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    zoomMeetingId?: string;
    zoomConnected: boolean;
    /**
     * False when an admin/manager is editing someone else's class. Zoom is connected
     * per teacher via OAuth on their own profile, so an admin can neither use the
     * "your Profile" link (it is teacher-gated and 404s) nor act on the teacher's
     * behalf — they get told who has to do it instead.
     */
    viewerIsOwner: boolean;
    /** The owning teacher's name, shown to non-owners. */
    ownerName?: string | null;
}

/** Create/refresh (or detach) a Zoom meeting for a class. */
export default function ZoomMeetingManager({ info }: { info: ZoomMeetingInfo }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    function createMeeting() {
        const staffId = info.staffId;
        if (!staffId) {
            setError(
                info.viewerIsOwner
                    ? 'No teaching profile linked to your account.'
                    : 'This class has no teacher assigned, so there is no Zoom account to host it.',
            );
            return;
        }
        startTransition(async () => {
            setError(null);
            setMessage(null);
            try {
                const meeting = await callFunction<
                    { staffId: string; title: string; date: string; startTime: string; endTime: string; meetingId?: string },
                    { meetingId: string; startUrl?: string; joinUrl?: string }
                >('createZoomMeeting', {
                    staffId,
                    title: info.title,
                    date: info.date,
                    startTime: info.startTime,
                    endTime: info.endTime,
                    ...(info.zoomMeetingId ? { meetingId: info.zoomMeetingId } : {}),
                });
                const saved = await saveZoomMeetingAction(info.classId, { meetingId: meeting.meetingId, startUrl: meeting.startUrl });
                if (saved.error) setError(saved.error);
                else {
                    setMessage(info.zoomMeetingId ? 'Zoom meeting updated.' : 'Zoom meeting created — students can now join.');
                    router.refresh();
                }
            } catch (e: unknown) {
                setError((e as Error)?.message ?? 'Could not create the Zoom meeting.');
            }
        });
    }

    function detach() {
        startTransition(async () => {
            await clearZoomMeetingAction(info.classId);
            router.refresh();
        });
    }

    return (
        <section className="card space-y-3">
            <h2 className="font-semibold">Zoom meeting</h2>
            {!info.zoomConnected && (
                <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {info.viewerIsOwner ? (
                        <>
                            Connect your Zoom account in your{' '}
                            <a href="/teacher/profile" className="underline">Profile</a> to host this class on Zoom.
                        </>
                    ) : (
                        <>
                            {info.ownerName ? `${info.ownerName} has` : 'This class’s teacher has'} not connected a
                            Zoom account yet, so this class cannot be hosted on Zoom. Only they can connect it, from
                            their own profile.
                        </>
                    )}
                </p>
            )}
            {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
            {message && <p className="rounded-lg bg-green-50 p-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">{message}</p>}

            {info.zoomMeetingId ? (
                <div className="space-y-2 text-sm">
                    <p>Zoom meeting <span className="font-mono">{info.zoomMeetingId}</span> is attached. Students get unique, non-shareable join links.</p>
                    <div className="flex gap-2">
                        <button type="button" onClick={createMeeting} disabled={pending || !info.zoomConnected} className="btn-secondary px-3 py-1.5 text-xs">
                            {pending ? 'Updating…' : 'Update meeting time'}
                        </button>
                        <button type="button" onClick={detach} disabled={pending} className="btn-secondary px-3 py-1.5 text-xs text-red-600">
                            Detach
                        </button>
                    </div>
                </div>
            ) : (
                <button type="button" onClick={createMeeting} disabled={pending || !info.zoomConnected} className="btn-primary px-4 py-1.5 text-sm">
                    {pending ? 'Creating…' : 'Create Zoom meeting for this class'}
                </button>
            )}
        </section>
    );
}
