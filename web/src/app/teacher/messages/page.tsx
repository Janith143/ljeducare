import type { NotificationSettings } from '@ljeducare/shared';
import { COLLECTIONS, SETTINGS_DOCS, channelsFor } from '@ljeducare/shared';
import TeacherMessageForm from '@/components/teacher/TeacherMessageForm';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile, listTeacherClasses } from '@/lib/data/teacher';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Message students' };

/** Teacher → their own enrolled students. Recipients are re-derived server-side in the callable. */
export default async function TeacherMessagesPage() {
    const user = await requireRole('teacher', 'teacher_admin');
    const staff = await getOwnStaffProfile(user);
    const [classes, notifDoc] = await Promise.all([
        listTeacherClasses(user, staff?.id ?? null),
        adminDb().doc(`${COLLECTIONS.SETTINGS}/${SETTINGS_DOCS.NOTIFICATIONS}`).get(),
    ]);

    const allowed = channelsFor((notifDoc.data() as NotificationSettings) ?? {}, 'teacherMessage');
    const options = classes.map((c) => ({ id: c.id, title: c.title }));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Message Students</h1>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Reaches only students enrolled in your classes.
                </p>
            </div>

            {options.length === 0 ? (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                    You have no classes yet — schedule one first and your enrolled students will appear here.
                </p>
            ) : (
                <TeacherMessageForm classes={options} allowed={allowed} />
            )}
        </div>
    );
}
