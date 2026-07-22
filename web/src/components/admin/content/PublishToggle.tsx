'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { togglePublishClassAction } from '@/app/teacher/classes/actions';
import { togglePublishCourseAction } from '@/app/teacher/courses/actions';

/**
 * Publish/unpublish straight from the admin tables, so an admin never has to detour
 * into the teaching area just to put an approved item live.
 * Reuses the teacher actions — admins/managers are in CONTENT_ROLES, and the actions
 * already refuse to publish anything unapproved.
 */
export default function PublishToggle({
    kind,
    id,
    isPublished,
}: {
    kind: 'class' | 'course';
    id: string;
    isPublished: boolean;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function toggle() {
        setBusy(true);
        setError(null);
        const res =
            kind === 'class'
                ? await togglePublishClassAction(id, !isPublished)
                : await togglePublishCourseAction(id, !isPublished);
        setBusy(false);
        if (res?.error) {
            setError(res.error);
            return;
        }
        router.refresh();
    }

    return (
        <span className="inline-flex items-center gap-2">
            {error && <span className="text-xs text-red-600">{error}</span>}
            <button
                type="button"
                onClick={toggle}
                disabled={busy}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
                {busy ? '…' : isPublished ? 'Unpublish' : 'Publish'}
            </button>
        </span>
    );
}
