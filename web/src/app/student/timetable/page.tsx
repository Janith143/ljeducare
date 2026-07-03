import Link from 'next/link';
import type { LiveClass } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Weekly timetable built from the student's enrolled classes. */
export default async function StudentTimetablePage() {
    const user = await requireRole('student');
    const db = adminDb();

    const [userDoc, classesSnap] = await Promise.all([
        db.collection(COLLECTIONS.USERS).doc(user.uid).get(),
        db.collection(COLLECTIONS.CLASSES).get(),
    ]);
    const enrolled = new Set((userDoc.data()?.enrolledClassIds ?? []).map(String));
    const classes = classesSnap.docs
        .map((d) => ({ ...(d.data() as LiveClass), id: d.id }))
        .filter((c) => enrolled.has(c.id) && !c.isDeleted && c.status === 'scheduled');

    // Bucket each class under its weekday (derived from its start date).
    const byDay: Record<string, LiveClass[]> = Object.fromEntries(DAYS.map((d) => [d, []]));
    for (const cls of classes) {
        const day = DAYS[new Date(`${cls.date}T00:00:00`).getDay()] ?? 'Monday';
        byDay[day].push(cls);
    }
    for (const d of DAYS) byDay[d].sort((a, b) => a.startTime.localeCompare(b.startTime));

    const hasAny = classes.length > 0;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">My Timetable</h1>
            {hasAny ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {DAYS.filter((d) => byDay[d].length).map((day) => (
                        <div key={day} className="card space-y-2">
                            <h2 className="font-semibold">{day}</h2>
                            {byDay[day].map((cls) => (
                                <div key={cls.id} className="rounded-lg border border-light-border p-2 text-sm dark:border-dark-border">
                                    <p className="font-medium">{cls.title}</p>
                                    <p className="text-xs text-light-subtle dark:text-dark-subtle">
                                        {cls.startTime}–{cls.endTime} · {cls.subject}
                                        {cls.recurrence === 'weekly' ? ' · weekly' : ` · ${cls.date}`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                    No classes on your timetable yet — <Link href="/classes" className="text-primary hover:underline">enroll in a class</Link>.
                </p>
            )}
        </div>
    );
}
