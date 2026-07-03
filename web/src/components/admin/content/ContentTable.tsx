import Link from 'next/link';
import { formatCurrencyCompact, type Course, type LiveClass } from '@ljeducare/shared';

export type ContentRow = {
    id: string;
    kind: 'class' | 'course';
    title: string;
    subject: string;
    teacherName: string;
    isPublished: boolean;
    price: number;
    isFree: boolean;
    href: string;
};

export function toRows(
    classes: LiveClass[],
    courses: Course[],
    teacherNames: Record<string, string>,
): ContentRow[] {
    const name = (id?: string | null) => (id && teacherNames[id]) || '—';
    return [
        ...classes.map((c) => ({
            id: c.id,
            kind: 'class' as const,
            title: c.title,
            subject: c.subject,
            teacherName: name(c.teacherId),
            isPublished: !!c.isPublished,
            price: c.pricing?.basePrice ?? 0,
            isFree: !!c.pricing?.isFree || !(c.pricing?.basePrice > 0),
            href: `/classes/${c.slug}`,
        })),
        ...courses.map((c) => ({
            id: c.id,
            kind: 'course' as const,
            title: c.title,
            subject: c.subject,
            teacherName: name(c.teacherId),
            isPublished: !!c.isPublished,
            price: c.pricing?.basePrice ?? 0,
            isFree: !!c.pricing?.isFree || !(c.pricing?.basePrice > 0),
            href: `/courses/${c.slug}`,
        })),
    ];
}

/** Read-only content oversight table (server component). */
export default function ContentTable({ rows }: { rows: ContentRow[] }) {
    if (!rows.length) {
        return <p className="card text-sm text-light-subtle dark:text-dark-subtle">Nothing here yet.</p>;
    }
    return (
        <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-light-border text-left dark:border-dark-border">
                        <th className="p-3">Title</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Teacher</th>
                        <th className="p-3">Fee</th>
                        <th className="p-3">Status</th>
                        <th className="p-3" />
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={`${row.kind}-${row.id}`} className="border-b border-light-border dark:border-dark-border">
                            <td className="p-3 font-medium">
                                {row.title}
                                <span className="block text-xs font-normal text-light-subtle dark:text-dark-subtle">{row.subject}</span>
                            </td>
                            <td className="p-3">{row.kind}</td>
                            <td className="p-3">{row.teacherName}</td>
                            <td className="p-3 whitespace-nowrap">
                                {row.isFree ? 'Free' : formatCurrencyCompact({ amount: row.price, currency: 'LKR' })}
                            </td>
                            <td className="p-3">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.isPublished ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                                    {row.isPublished ? 'Published' : 'Draft'}
                                </span>
                            </td>
                            <td className="p-3 text-right">
                                {row.isPublished && (
                                    <Link href={row.href} className="text-xs text-primary hover:underline">
                                        View public page ↗
                                    </Link>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
