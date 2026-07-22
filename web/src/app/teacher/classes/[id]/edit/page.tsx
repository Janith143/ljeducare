import { notFound } from 'next/navigation';
import type { LiveClass, StaffMember } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import ClassForm from '@/components/teacher/ClassForm';
import ZoomMeetingManager from '@/components/teacher/ZoomMeetingManager';
import HomeworkSubmissions from '@/components/teacher/HomeworkSubmissions';
import type { User } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { CONTENT_ROLES, assignsTeacher } from '@/lib/auth/contentRoles';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { listCategories } from '@/lib/data/categories';
import { listStaff } from '@/lib/data/staff';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function EditClassPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await requireRole(...CONTENT_ROLES);
    const { id } = await params;

    const doc = await adminDb().collection(COLLECTIONS.CLASSES).doc(id).get();
    if (!doc.exists || doc.data()!.isDeleted) notFound();
    const cls = { ...(doc.data() as LiveClass), id: doc.id };

    // The owning teacher's staff profile (for the Zoom host + connection state).
    let ownerStaff: StaffMember | null = null;
    if (!assignsTeacher(user.role)) {
        ownerStaff = await getOwnStaffProfile(user);
        if (!ownerStaff || cls.teacherId !== ownerStaff.id) notFound();
    } else if (cls.teacherId) {
        const s = await adminDb().collection(COLLECTIONS.STAFF).doc(cls.teacherId).get();
        ownerStaff = s.exists ? ({ ...(s.data() as StaffMember), id: s.id }) : null;
    }

    // Resolve student names for any homework submissions.
    const submissions = (cls.homeworkSubmissions ?? {}) as Record<string, { studentId: string; link: string; submittedAt: string }[]>;
    const studentIds = [...new Set(Object.values(submissions).flat().map((s) => s.studentId))];
    const studentNames: Record<string, string> = {};
    if (studentIds.length) {
        const docs = await Promise.all(
            studentIds.map((sid) => adminDb().collection(COLLECTIONS.USERS).doc(sid).get()),
        );
        docs.forEach((d) => {
            if (d.exists) {
                const u = d.data() as User;
                studentNames[d.id] = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || d.id;
            }
        });
    }

    const categories = (await listCategories()).map((c) => ({ slug: c.slug, name: c.name }));
    // Admins/managers/teacher_admins may (re)assign the owning teacher.
    const teachers = assignsTeacher(user.role)
        ? (await listStaff()).map((s) => ({ id: s.id, name: s.name }))
        : undefined;

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">Edit class</h1>
            <ClassForm existing={cls} categories={categories} teachers={teachers} />
            <HomeworkSubmissions submissions={submissions} studentNames={studentNames} />
            <ZoomMeetingManager
                info={{
                    classId: cls.id,
                    staffId: cls.teacherId ?? null,
                    title: cls.title,
                    date: cls.date,
                    startTime: cls.startTime,
                    endTime: cls.endTime,
                    zoomMeetingId: cls.zoomMeetingId,
                    zoomConnected: !!ownerStaff?.zoomAccountConnected,
                    // Only a plain teacher reaches this page as the class owner — the
                    // guard above proves it. Everyone else is managing another
                    // teacher's class and must not be pointed at /teacher/profile.
                    viewerIsOwner: !assignsTeacher(user.role),
                    ownerName: ownerStaff?.name ?? null,
                }}
            />
        </div>
    );
}
