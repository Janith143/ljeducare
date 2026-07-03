import Link from 'next/link';
import ClassListTable from '@/components/teacher/ClassListTable';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile, listTeacherClasses } from '@/lib/data/teacher';

export const dynamic = 'force-dynamic';

export default async function TeacherClassesPage() {
    const user = await requireRole('teacher', 'teacher_admin');
    const staff = await getOwnStaffProfile(user);
    const classes = await listTeacherClasses(user, staff?.id ?? null);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    {user.role === 'teacher_admin' ? 'All Classes' : 'My Classes'}
                </h1>
                <Link href="/teacher/classes/new" className="btn-primary">
                    + Schedule a class
                </Link>
            </div>
            <ClassListTable classes={classes} />
        </div>
    );
}
