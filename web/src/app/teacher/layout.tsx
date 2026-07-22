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
    // Admins/managers arrive here from the admin dashboard — give them a way back.
    const nav =
        user.role === 'main_admin' || user.role === 'manager'
            ? [...NAV, { href: '/admin', label: '← Back to Admin' }]
            : NAV;
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
