'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitHomeworkAction } from '@/app/student/classes/actions';

/** Compact per-class homework link submitter. */
export default function HomeworkSubmitForm({ classId }: { classId: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [link, setLink] = useState('');
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ ok?: boolean; text: string } | null>(null);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        startTransition(async () => {
            setMessage(null);
            const result = await submitHomeworkAction(classId, link);
            if (result.error) setMessage({ text: result.error });
            else {
                setMessage({ ok: true, text: 'Homework submitted.' });
                setLink('');
                router.refresh();
            }
        });
    }

    if (!open) {
        return (
            <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-primary hover:underline">
                + Submit homework
            </button>
        );
    }
    return (
        <form onSubmit={submit} className="space-y-1">
            {message && (
                <p className={`text-xs ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
            )}
            <div className="flex gap-2">
                <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="Homework link (Google Drive, Docs…)"
                    className="input flex-1 py-1 text-sm"
                />
                <button type="submit" disabled={pending} className="btn-primary px-3 py-1 text-xs">
                    {pending ? '…' : 'Submit'}
                </button>
            </div>
        </form>
    );
}
