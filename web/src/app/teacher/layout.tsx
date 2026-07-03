import DashboardShell from '@/components/layout/DashboardShell';
import { requireRole } from '@/lib/auth/session';
import { AuthProvider } from '@/providers/AuthProvider';

const NAV = [
    { href: '/teacher', label: 'Overview' },
    { href: '/teacher/classes', label: 'Classes' },
    { href: '/teacher/courses', label: 'Courses' },
    { href: '/teacher/quizzes', label: 'Quizzes' },
    { href: '/teacher/exams', label: 'Exam Results' },
    { href: '/teacher/students', label: 'Students' },
    { href: '/teacher/earnings', label: 'Earnings' },
    { href: '/teacher/profile', label: 'Profile' },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
    const user = await requireRole('teacher', 'teacher_admin');
    return (
        <AuthProvider user={user}>
            <DashboardShell
                title="Teacher"
                nav={NAV}
                userName={user.name ?? user.email ?? ''}
                roleLabel={user.role === 'teacher_admin' ? 'Teacher Admin' : 'Teacher'}
                uid={user.uid}
            >
                {children}
            </DashboardShell>
        </AuthProvider>
    );
}
