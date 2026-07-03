import 'server-only';

import type { Course, LiveClass, StaffMember } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { adminDb } from '@/lib/firebase/admin';

/** All non-deleted classes + courses + a teacherId→name map (admin oversight). */
export async function loadAllContent() {
    const db = adminDb();
    const [classesSnap, coursesSnap, staffSnap] = await Promise.all([
        db.collection(COLLECTIONS.CLASSES).get(),
        db.collection(COLLECTIONS.COURSES).get(),
        db.collection(COLLECTIONS.STAFF).get(),
    ]);
    const classes = classesSnap.docs
        .map((d) => ({ ...(d.data() as LiveClass), id: d.id }))
        .filter((c) => !c.isDeleted)
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    const courses = coursesSnap.docs
        .map((d) => ({ ...(d.data() as Course), id: d.id }))
        .filter((c) => !c.isDeleted)
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    const teacherNames: Record<string, string> = {};
    staffSnap.docs.forEach((d) => {
        teacherNames[d.id] = (d.data() as StaffMember).name;
    });
    return { classes, courses, teacherNames };
}
