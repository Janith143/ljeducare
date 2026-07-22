import { isTeachingRole } from '@ljeducare/shared';
import DashboardShell from '@/components/layout/DashboardShell';
import { requireRole } from '@/lib/auth/session';
import { CONTENT_ROLES } from '@/lib/auth/contentRoles';
import { AuthProvider } from '@/providers/AuthProvider';

const NAV = [
    { href: '/teacher', label: 'Overview' },
    { href: '/teacher/classes', label: 'Classes' },
    { href: '/teacher/courses', label: 'Courses' },
    { href: '/teacher/quizzes', label: 'Quizzes' },
    { href: '/teacher/exams', label: 'Exam Results' },
    { href: '/teacher/attendance', label: 'Attendance' },
    { href: '/teacher/students', label: 'Students' },
    { href: '/teacher/messages', label: 'Message Students' },
    { href: '/teacher/earnings', label: 'Earnings' },
    { href: '/teacher/profile', label: 'Profile' },
];

const ROLE_LABEL: Record<string, string> = {
    teacher: 'Teacher',
    teacher_admin: 'Teacher Admin',
    main_admin: 'Main Admin',
    manager: 'Manager',
};

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
    // Admins and managers work in here too — they create and manage classes/courses
    // on behalf of teachers (see lib/auth/contentRoles.ts).
    const user = await requireRole(...CONTENT_ROLES);
    // ...but main_admin gets ONLY those two pages. The rest of the teaching area is
    // personal to a staff profile (earnings, profile, own students/attendance), which
    // main_admin does not have — showing them the full nav is just a list of 404s.
    // Managers and teacher admins DO have one, so they see everything.
    const isTeaching = isTeachingRole(user.role);
    const nav = isTeaching
        ? NAV
        : [
              { href: '/teacher/classes', label: 'Classes' },
              { href: '/teacher/courses', label: 'Courses' },
              { href: '/admin', label: '← Back to Admin' },
          ];
    return (
        <AuthProvider user={user}>
            <DashboardShell
                title={user.role === 'teacher' ? 'Teacher' : 'Teaching'}
                nav={nav}
                userName={user.name ?? user.email ?? ''}
                roleLabel={ROLE_LABEL[user.role] ?? user.role}
                uid={user.uid}
            >
                {children}
            </DashboardShell>
        </AuthProvider>
    );
}
