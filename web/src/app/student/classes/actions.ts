'use server';

import { revalidatePath } from 'next/cache';
import { COLLECTIONS } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

/** A student submits a homework link for a class (stored per session date). */
export async function submitHomeworkAction(classId: string, link: string) {
    const user = await requireRole('student');
    const url = link.trim();
    if (!/^https?:\/\/.+/.test(url)) return { error: 'Enter a valid link (https://…).' };

    const db = adminDb();
    const ref = db.collection(COLLECTIONS.CLASSES).doc(classId);
    try {
        await db.runTransaction(async (tx) => {
            const doc = await tx.get(ref);
            if (!doc.exists) throw new Error('Class not found.');
            const cls = doc.data()!;

            // Must be enrolled to submit.
            const enrollDoc = await tx.get(db.collection(COLLECTIONS.USERS).doc(user.uid));
            const enrolled = (enrollDoc.data()?.enrolledClassIds ?? []).map(String).includes(classId);
            if (!enrolled) throw new Error('Enroll in this class to submit homework.');

            const date = new Date().toISOString().slice(0, 10);
            const map = { ...(cls.homeworkSubmissions ?? {}) };
            const forDate = (map[date] ?? []).filter((s: { studentId: string }) => s.studentId !== user.uid);
            forDate.push({ studentId: user.uid, link: url, submittedAt: new Date().toISOString() });
            map[date] = forDate;
            tx.update(ref, { homeworkSubmissions: map });
        });
        revalidatePath('/student/classes');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}
