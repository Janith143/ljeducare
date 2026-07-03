import Link from 'next/link';
import type { LiveClass } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function StudentClassesPage() {
    const user = await requireRole('student');
    const db = adminDb();

    const [userDoc, classesSnap] = await Promise.all([
        db.collection(COLLECTIONS.USERS).doc(user.uid).get(),
        db.collection(COLLECTIONS.CLASSES).get(),
    ]);
    const enrolledIds = new Set((userDoc.data()?.enrolledClassIds ?? []).map(String));
    const classes = classesSnap.docs
        .map((d) => ({ ...(d.data() as LiveClass), id: d.id }))
        .filter((c) => enrolledIds.has(c.id) && !c.isDeleted)
        .sort((a, b) => a.date.localeCompare(b.date));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">My Classes</h1>
            {classes.length ? (
                <div className="space-y-4">
                    {classes.map((cls) => {
                        const recordings = Object.entries(cls.recordingUrls ?? {}).sort((a, b) =>
                            b[0].localeCompare(a[0]),
                        );
                        return (
                            <div key={cls.id} className="card space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h2 className="font-semibold">{cls.title}</h2>
                                        <p className="text-sm text-light-subtle dark:text-dark-subtle">
                                            {cls.subject} ·{' '}
                                            {cls.recurrence === 'weekly' ? 'Weekly' : cls.date} · {cls.startTime}–{cls.endTime}
                                        </p>
                                    </div>
                                    {cls.joiningLink ? (
                                        <a href={cls.joiningLink} target="_blank" rel="noreferrer" className="btn-primary">
                                            Join Now ↗
                                        </a>
                                    ) : (
                                        <span className="text-sm text-light-subtle dark:text-dark-subtle">
                                            Joining link not set yet
                                        </span>
                                    )}
                                </div>
                                {recordings.length > 0 && (
                                    <div className="border-t border-light-border pt-3 dark:border-dark-border">
                                        <p className="mb-2 text-sm font-medium">Recordings</p>
                                        <div className="flex flex-wrap gap-2">
                                            {recordings.map(([date, urls]) => (
                                                <Link
                                                    key={date}
                                                    href={`/watch/recording/${cls.id}/${date}`}
                                                    className="btn-secondary px-3 py-1 text-xs"
                                                >
                                                    ▶ {date}
                                                    {urls.length > 1 ? ` (${urls.length} parts)` : ''}
                                                </Link>
                                            ))}
                                        </div>
                                        {(cls.recordingMaxViews ?? 0) > 0 && (
                                            <p className="mt-2 text-xs text-light-subtle dark:text-dark-subtle">
                                                Limited to {cls.recordingMaxViews} views per recording.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                    You aren&apos;t enrolled in any classes yet —{' '}
                    <Link href="/classes" className="text-primary hover:underline">browse classes</Link>.
                </p>
            )}
        </div>
    );
}
