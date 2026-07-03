import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FieldValue } from 'firebase-admin/firestore';
import type { LiveClass } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import SecureVideoPlayer from '@/components/player/SecureVideoPlayer';

export const dynamic = 'force-dynamic';

/**
 * Protected recording player. Enforces (server-side, before the player renders):
 *   enrollment · expiry (recordingExpiryDays after session date) · per-student
 *   view cap (users.recordingViews["classId_date"] vs recordingMaxViews).
 * Each page load counts as one view — ported hybridLMS cap model.
 */
export default async function RecordingWatchPage({
    params,
}: {
    params: Promise<{ classId: string; date: string }>;
}) {
    const user = await requireRole('student');
    const { classId, date } = await params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

    const db = adminDb();
    const [classDoc, userDoc] = await Promise.all([
        db.collection(COLLECTIONS.CLASSES).doc(classId).get(),
        db.collection(COLLECTIONS.USERS).doc(user.uid).get(),
    ]);
    if (!classDoc.exists || classDoc.data()!.isDeleted) notFound();
    const cls = { ...(classDoc.data() as LiveClass), id: classDoc.id };
    const student = userDoc.data() ?? {};

    if (!((student.enrolledClassIds as string[] | undefined) ?? []).map(String).includes(cls.id)) {
        return <Blocked title={cls.title} reason="You are not enrolled in this class." cta="Enroll" href={`/checkout/class/${cls.id}`} />;
    }

    const urls = cls.recordingUrls?.[date] ?? [];
    if (!urls.length) notFound();

    // Expiry: N days after the session date (0/undefined = never expires; default 60).
    const expiryDays = cls.recordingExpiryDays ?? 60;
    if (expiryDays > 0) {
        const expiresAt = new Date(date);
        expiresAt.setDate(expiresAt.getDate() + expiryDays);
        if (new Date() > expiresAt) {
            return <Blocked title={cls.title} reason={`This recording expired on ${expiresAt.toISOString().slice(0, 10)}.`} />;
        }
    }

    // View cap: count this load, block when over.
    const viewKey = `${cls.id}_${date}`;
    const maxViews = cls.recordingMaxViews ?? 0;
    const used = ((student.recordingViews as Record<string, number> | undefined) ?? {})[viewKey] ?? 0;
    if (maxViews > 0 && used >= maxViews) {
        return <Blocked title={cls.title} reason={`You have used all ${maxViews} views for this recording.`} />;
    }
    await userDoc.ref.update({ [`recordingViews.${viewKey}`]: FieldValue.increment(1) });
    const viewsLeft = maxViews > 0 ? maxViews - used - 1 : null;
    const watermark = `${user.name ?? user.email ?? 'Student'} · ${user.uid.slice(0, 8)}`;

    return (
        <div className="min-h-screen bg-black text-white">
            <header className="flex items-center justify-between p-4">
                <div>
                    <h1 className="font-semibold">{cls.title}</h1>
                    <p className="text-xs text-slate-400">
                        Recording · {date}
                        {viewsLeft !== null && ` · ${viewsLeft} view${viewsLeft === 1 ? '' : 's'} remaining after this one`}
                    </p>
                </div>
                <Link href="/student/classes" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
                    ← My Classes
                </Link>
            </header>
            <main className="mx-auto max-w-5xl space-y-6 p-4">
                {urls.map((url, i) => (
                    <div key={url} className="space-y-1">
                        {urls.length > 1 && <p className="text-sm text-slate-300">Part {i + 1}</p>}
                        <SecureVideoPlayer url={url} watermark={watermark} title={cls.title} />
                    </div>
                ))}
                <p className="text-center text-xs text-slate-500">
                    This recording is licensed to {watermark}. Do not record or share it.
                </p>
            </main>
        </div>
    );
}

function Blocked({ title, reason, cta, href }: { title: string; reason: string; cta?: string; href?: string }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-light-background p-6 text-center dark:bg-dark-background">
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-light-subtle dark:text-dark-subtle">{reason}</p>
            <div className="flex gap-3">
                {cta && href && <Link href={href} className="btn-primary">{cta}</Link>}
                <Link href="/student/classes" className="btn-secondary">← My Classes</Link>
            </div>
        </div>
    );
}
