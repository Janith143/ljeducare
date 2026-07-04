'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Search box → /search?q=… (or /categories when empty). `large` = hero variant. */
export default function HeaderSearch({ large = false }: { large?: boolean }) {
    const router = useRouter();
    const [q, setQ] = useState('');

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const t = q.trim();
        router.push(t ? `/search?q=${encodeURIComponent(t)}` : '/categories');
    }

    return (
        <form onSubmit={submit} className="flex w-full items-center gap-2">
            <div className="relative flex-1">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-light-subtle dark:text-dark-subtle" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="9" r="6" />
                    <path d="m14 14 4 4" strokeLinecap="round" />
                </svg>
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search courses, classes, teachers…"
                    aria-label="Search"
                    className={`w-full rounded-full border border-light-border bg-light-surface pl-9 pr-4 text-sm outline-none focus:border-primary dark:border-dark-border dark:bg-dark-surface ${large ? 'py-3' : 'py-2'}`}
                />
            </div>
            <button type="submit" className={`btn-primary rounded-full ${large ? 'px-6 py-3' : 'px-4 py-2 text-sm'}`}>
                Search
            </button>
        </form>
    );
}
