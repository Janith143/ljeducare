import 'server-only';

import { COLLECTIONS } from '@ljeducare/shared';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Cascade a teacher's removal/suspension to their content.
 *
 * Chosen behaviour: content is SOFT-DELETED (isDeleted), which hides it from the
 * public catalog AND from enrolled students — student pages and the recording
 * player gate on `isDeleted`, not `isPublished`. That means students who already
 * paid lose access, so every write is tagged with `cascadedFromTeacher` and is
 * reversible via restoreTeacherContent(): reactivating the teacher gives access back.
 *
 * Nothing is ever hard-deleted.
 */

/** Content collections that carry a `teacherId`. */
const CONTENT_COLLECTIONS = [COLLECTIONS.CLASSES, COLLECTIONS.COURSES, COLLECTIONS.QUIZZES] as const;

export interface CascadeCounts {
    classes: number;
    courses: number;
    quizzes: number;
    total: number;
}

const emptyCounts = (): CascadeCounts => ({ classes: 0, courses: 0, quizzes: 0, total: 0 });

function bump(counts: CascadeCounts, col: string, n: number) {
    if (col === COLLECTIONS.CLASSES) counts.classes += n;
    else if (col === COLLECTIONS.COURSES) counts.courses += n;
    else if (col === COLLECTIONS.QUIZZES) counts.quizzes += n;
    counts.total += n;
}

/**
 * Hide every piece of content belonging to a teacher.
 * Skips anything already deleted, so a re-run is a no-op and we never overwrite the
 * original deletion reason of content removed for its own sake.
 */
export async function cascadeTeacherContent(
    staffId: string,
    opts: { by: string; reason: 'removed' | 'suspended' },
): Promise<CascadeCounts> {
    const db = adminDb();
    const counts = emptyCounts();
    if (!staffId) return counts;
    const stamp = new Date().toISOString();

    for (const col of CONTENT_COLLECTIONS) {
        const snap = await db.collection(col).where('teacherId', '==', staffId).get();
        const targets = snap.docs.filter((d) => (d.data() || {}).isDeleted !== true);
        if (!targets.length) continue;

        // Batches cap at 500 writes.
        for (let i = 0; i < targets.length; i += 400) {
            const batch = db.batch();
            targets.slice(i, i + 400).forEach((d) =>
                batch.update(d.ref, {
                    isDeleted: true,
                    isPublished: false,
                    // Markers make this auditable and let restore touch ONLY what we hid.
                    cascadedFromTeacher: staffId,
                    cascadedReason: opts.reason,
                    cascadedAt: stamp,
                    cascadedBy: opts.by,
                }),
            );
            await batch.commit();
        }
        bump(counts, col, targets.length);
    }
    return counts;
}

/**
 * Undo a cascade when the teacher comes back.
 * Only reverts docs this cascade hid (`cascadedFromTeacher == staffId`), so content
 * an admin deleted deliberately stays deleted. Access is restored (isDeleted:false)
 * but publication is NOT — republishing to the public catalog stays a deliberate act.
 */
export async function restoreTeacherContent(
    staffId: string,
    opts: { by: string },
): Promise<CascadeCounts> {
    const db = adminDb();
    const counts = emptyCounts();
    if (!staffId) return counts;
    const stamp = new Date().toISOString();

    for (const col of CONTENT_COLLECTIONS) {
        const snap = await db.collection(col).where('cascadedFromTeacher', '==', staffId).get();
        const targets = snap.docs.filter((d) => (d.data() || {}).isDeleted === true);
        if (!targets.length) continue;

        for (let i = 0; i < targets.length; i += 400) {
            const batch = db.batch();
            targets.slice(i, i + 400).forEach((d) =>
                batch.update(d.ref, {
                    isDeleted: false,
                    cascadedFromTeacher: null,
                    cascadedReason: null,
                    cascadedAt: null,
                    cascadedBy: null,
                    restoredAt: stamp,
                    restoredBy: opts.by,
                }),
            );
            await batch.commit();
        }
        bump(counts, col, targets.length);
    }
    return counts;
}

/**
 * How many students would lose access if this teacher's content were hidden —
 * shown to the admin before/after removal so the decision is informed.
 * Counts distinct students enrolled in any of the teacher's classes or courses.
 */
export async function countAffectedStudents(staffId: string): Promise<number> {
    const db = adminDb();
    if (!staffId) return 0;

    const [classSnap, courseSnap] = await Promise.all([
        db.collection(COLLECTIONS.CLASSES).where('teacherId', '==', staffId).get(),
        db.collection(COLLECTIONS.COURSES).where('teacherId', '==', staffId).get(),
    ]);
    const classIds = classSnap.docs.map((d) => d.id);
    const courseIds = courseSnap.docs.map((d) => d.id);
    if (!classIds.length && !courseIds.length) return 0;

    const students = new Set<string>();
    // array-contains-any caps at 30 values per query.
    const scan = async (field: string, ids: string[]) => {
        for (let i = 0; i < ids.length; i += 30) {
            const snap = await db
                .collection(COLLECTIONS.USERS)
                .where(field, 'array-contains-any', ids.slice(i, i + 30))
                .get();
            snap.docs.forEach((d) => students.add(d.id));
        }
    };
    if (classIds.length) await scan('enrolledClassIds', classIds);
    if (courseIds.length) await scan('enrolledCourseIds', courseIds);
    return students.size;
}
