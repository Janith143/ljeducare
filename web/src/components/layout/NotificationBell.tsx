'use client';

import { useEffect, useRef, useState } from 'react';

interface Notification {
    id: string;
    title: string;
    body: string;
    link?: string | null;
    read: boolean;
    createdAt: string;
}

/** Live notification bell — reads the signed-in user's own notifications. */
export default function NotificationBell({ uid }: { uid: string }) {
    const [items, setItems] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let unsub: (() => void) | undefined;
        (async () => {
            const { getClientDb } = await import('@/lib/firebase/client');
            const { collection, onSnapshot, query, where, orderBy, limit } = await import('firebase/firestore');
            const q = query(
                collection(getClientDb(), 'notifications'),
                where('recipientId', '==', uid),
                orderBy('createdAt', 'desc'),
                limit(20),
            );
            unsub = onSnapshot(
                q,
                (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Notification, 'id'>) }))),
                () => setItems([]),
            );
        })();
        return () => unsub?.();
    }, [uid]);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const unread = items.filter((i) => !i.read).length;

    async function markRead(n: Notification) {
        if (n.read) return;
        const { getClientDb } = await import('@/lib/firebase/client');
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(getClientDb(), 'notifications', n.id), { read: true }).catch(() => {});
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="relative rounded-lg p-2 hover:bg-light-background dark:hover:bg-dark-background"
                aria-label="Notifications"
            >
                <span className="text-lg">🔔</span>
                {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-light-border bg-light-surface shadow-lg dark:border-dark-border dark:bg-dark-surface">
                    <p className="border-b border-light-border p-3 text-sm font-semibold dark:border-dark-border">Notifications</p>
                    {items.length ? (
                        items.map((n) => {
                            const Inner = (
                                <div className={`p-3 ${n.read ? '' : 'bg-primary/5'}`}>
                                    <p className="text-sm font-medium">{n.title}</p>
                                    <p className="text-xs text-light-subtle dark:text-dark-subtle">{n.body}</p>
                                    <p className="mt-1 text-[10px] text-light-subtle dark:text-dark-subtle">
                                        {new Date(n.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            );
                            return (
                                <div key={n.id} onClick={() => void markRead(n)} className="cursor-pointer border-b border-light-border last:border-0 dark:border-dark-border">
                                    {n.link ? <a href={n.link}>{Inner}</a> : Inner}
                                </div>
                            );
                        })
                    ) : (
                        <p className="p-4 text-sm text-light-subtle dark:text-dark-subtle">No notifications yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}
