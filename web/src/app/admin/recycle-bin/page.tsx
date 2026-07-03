import type { Course, LiveClass, Quiz, StaffMember } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import RecycleBinTable, { type DeletedRow } from '@/components/admin/recycle/RecycleBinTable';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/** Soft-deleted classes, courses and quizzes — restore or purge. */
export default async function AdminRecycleBinPage() {
    await requirePermission('recycle_bin');
    const db = adminDb();

    const [classesSnap, coursesSnap, quizzesSnap, staffSnap] = await Promise.all([
        db.collection(COLLECTIONS.CLASSES).where('isDeleted', '==', true).get(),
        db.collection(COLLECTIONS.COURSES).where('isDeleted', '==', true).get(),
        db.collection(COLLECTIONS.QUIZZES).where('isDeleted', '==', true).get(),
        db.collection(COLLECTIONS.STAFF).get(),
    ]);
    const teacherName: Record<string, string> = {};
    staffSnap.docs.forEach((d) => { teacherName[d.id] = (d.data() as StaffMember).name; });
    const name = (id?: string) => (id && teacherName[id]) || '—';

    const rows: DeletedRow[] = [
        ...classesSnap.docs.map((d) => {
            const c = d.data() as LiveClass;
            return { id: d.id, kind: 'class' as const, title: c.title, subject: c.subject, teacher: name(c.teacherId), deletedAt: (c as { deletedAt?: string }).deletedAt };
        }),
        ...coursesSnap.docs.map((d) => {
            const c = d.data() as Course;
            return { id: d.id, kind: 'course' as const, title: c.title, subject: c.subject, teacher: name(c.teacherId), deletedAt: (c as { deletedAt?: string }).deletedAt };
        }),
        ...quizzesSnap.docs.map((d) => {
            const c = d.data() as Quiz;
            return { id: d.id, kind: 'quiz' as const, title: c.title, subject: c.subject, teacher: name(c.teacherId), deletedAt: (c as { deletedAt?: string }).deletedAt };
        }),
    ].sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Recycle Bin</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Deleted classes, courses and quizzes. Restoring brings an item back as a draft;
                purging removes it permanently.
            </p>
            <RecycleBinTable rows={rows} />
        </div>
    );
}
