import DashboardShell from '@/components/layout/DashboardShell';
import { requireRole } from '@/lib/auth/session';
import { AuthProvider } from '@/providers/AuthProvider';

const NAV = [
    { href: '/student', label: 'Overview' },
    { href: '/student/classes', label: 'My Classes' },
    { href: '/student/courses', label: 'My Courses' },
    { href: '/student/quizzes', label: 'My Quizzes' },
    { href: '/student/attendance', label: 'Attendance' },
    { href: '/student/results', label: 'Score Card' },
    { href: '/student/certificates', label: 'Certificates' },
    { href: '/student/timetable', label: 'Timetable' },
    { href: '/student/transactions', label: 'Payments' },
    { href: '/student/profile', label: 'Profile' },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
    const user = await requireRole('student');
    return (
        <AuthProvider user={user}>
            <DashboardShell title="Student" nav={NAV} userName={user.name ?? user.email ?? ''} roleLabel="Student">
                {children}
            </DashboardShell>
        </AuthProvider>
    );
}
