import Link from 'next/link';
import ClassListTable from '@/components/teacher/ClassListTable';
import { requireRole } from '@/lib/auth/session';
import { CONTENT_ROLES } from '@/lib/auth/contentRoles';
import { getOwnStaffProfile, listTeacherClasses } from '@/lib/data/teacher';

export const dynamic = 'force-dynamic';

export default async function TeacherClassesPage() {
    // Admins/managers author classes here too, and land here after saving one —
    // a narrower guard 404s them on their own redirect. listTeacherClasses already
    // scopes the result (own classes for a teacher, all classes for everyone else).
    const user = await requireRole(...CONTENT_ROLES);
    const staff = await getOwnStaffProfile(user);
    const classes = await listTeacherClasses(user, staff?.id ?? null);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    {user.role === 'teacher' ? 'My Classes' : 'All Classes'}
                </h1>
                <Link href="/teacher/classes/new" className="btn-primary">
                    + Schedule a class
                </Link>
            </div>
            <ClassListTable classes={classes} />
        </div>
    );
}
