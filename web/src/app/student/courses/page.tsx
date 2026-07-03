import Link from 'next/link';
import type { Course } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import CourseLessonsPlayer from '@/components/student/CourseLessonsPlayer';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/** Enrolled recorded courses with protected lesson playback. */
export default async function StudentCoursesPage() {
    const user = await requireRole('student');
    const db = adminDb();

    const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
    const enrolledIds: string[] = (userDoc.data()?.enrolledCourseIds ?? []).map(String);
    const watermark = `${user.name ?? user.email ?? 'Student'} · ${user.uid.slice(0, 8)}`;

    // Load each enrolled course (server-side; enrolled students get full lesson URLs).
    const courses = (
        await Promise.all(
            enrolledIds.map(async (id) => {
                const d = await db.collection(COLLECTIONS.COURSES).doc(id).get();
                return d.exists ? ({ ...(d.data() as Course), id: d.id }) : null;
            }),
        )
    ).filter((c): c is Course => !!c && !c.isDeleted);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">My Courses</h1>
            {courses.length ? (
                <div className="space-y-6">
                    {courses.map((course) => (
                        <CourseLessonsPlayer
                            key={course.id}
                            title={course.title}
                            watermark={watermark}
                            lessons={(course.lectures ?? []).map((l) => ({
                                id: l.id,
                                title: l.title,
                                videoUrl: l.videoUrl,
                                durationMinutes: l.durationMinutes,
                            }))}
                        />
                    ))}
                </div>
            ) : (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                    You aren&apos;t enrolled in any courses yet —{' '}
                    <Link href="/courses" className="text-primary hover:underline">browse courses</Link>.
                </p>
            )}
        </div>
    );
}
