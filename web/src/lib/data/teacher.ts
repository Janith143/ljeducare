import 'server-only';

import type { Course, LiveClass, StaffMember, TeacherPayment } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { adminDb } from '@/lib/firebase/admin';
import type { SessionUser } from '@/lib/auth/session';

/**
 * Resolve the staff profile for the signed-in teacher.
 * teacher_admins without their own profile get null (they manage others').
 */
export async function getOwnStaffProfile(user: SessionUser): Promise<StaffMember | null> {
    const db = adminDb();
    if (user.tid) {
        const doc = await db.collection(COLLECTIONS.STAFF).doc(user.tid).get();
        if (doc.exists) return { ...(doc.data() as StaffMember), id: doc.id };
    }
    const byUser = await db
        .collection(COLLECTIONS.STAFF)
        .where('userId', '==', user.uid)
        .limit(1)
        .get();
    if (byUser.empty) return null;
    const doc = byUser.docs[0];
    return { ...(doc.data() as StaffMember), id: doc.id };
}

/** Classes this teacher may manage: own for teachers, all for teacher_admins. */
export async function listTeacherClasses(user: SessionUser, staffId: string | null): Promise<LiveClass[]> {
    const db = adminDb();
    const query =
        user.role === 'teacher_admin'
            ? db.collection(COLLECTIONS.CLASSES)
            : db.collection(COLLECTIONS.CLASSES).where('teacherId', '==', staffId ?? '__none__');
    const snap = await query.get();
    return snap.docs
        .map((d) => ({ ...(d.data() as LiveClass), id: d.id }))
        .filter((c) => !c.isDeleted)
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

/** Courses this teacher may manage (same scoping as classes). */
export async function listTeacherCourses(user: SessionUser, staffId: string | null): Promise<Course[]> {
    const db = adminDb();
    const query =
        user.role === 'teacher_admin'
            ? db.collection(COLLECTIONS.COURSES)
            : db.collection(COLLECTIONS.COURSES).where('teacherId', '==', staffId ?? '__none__');
    const snap = await query.get();
    return snap.docs
        .map((d) => ({ ...(d.data() as Course), id: d.id }))
        .filter((c) => !c.isDeleted)
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

/** Settlement history for one teacher (Pay & Reset log). */
export async function listTeacherPayments(staffId: string): Promise<TeacherPayment[]> {
    const snap = await adminDb()
        .collection(COLLECTIONS.TEACHER_PAYMENTS)
        .where('teacherId', '==', staffId)
        .get();
    return snap.docs
        .map((d) => ({ ...(d.data() as TeacherPayment), id: d.id }))
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

/** Unsettled commission owed to a teacher (completed sales since lastReset). */
export async function computeUnsettledCommission(staffId: string, lastReset?: string): Promise<number> {
    const snap = await adminDb()
        .collection(COLLECTIONS.SALES)
        .where('teacherId', '==', staffId)
        .where('status', '==', 'completed')
        .get();
    let sum = 0;
    snap.docs.forEach((d) => {
        const s = d.data();
        if (!lastReset || ((s.completedAt as string) || (s.saleDate as string)) > lastReset) {
            sum += (s.teacherCommission as number) || 0;
        }
    });
    return Math.round(sum * 100) / 100;
}
