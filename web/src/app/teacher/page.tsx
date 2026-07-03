import { requireRole } from '@/lib/auth/session';

export default async function TeacherOverviewPage() {
    const user = await requireRole('teacher', 'teacher_admin');
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
            <p className="text-light-subtle dark:text-dark-subtle">
                Signed in as {user.email}. Class and course management arrives with Phase 1.4.
            </p>
        </div>
    );
}
