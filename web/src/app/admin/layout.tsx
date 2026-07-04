import type { Permission } from '@ljeducare/shared';
import DashboardShell, { type NavItem } from '@/components/layout/DashboardShell';
import { requireRole } from '@/lib/auth/session';
import { AuthProvider } from '@/providers/AuthProvider';

const ROLE_LABELS: Record<string, string> = {
    main_admin: 'Main Admin',
    manager: 'Manager',
    teacher_admin: 'Teacher Admin',
};

/** Sidebar entries gated by permission key — only permitted links render. */
const ADMIN_NAV: (NavItem & { perm: Permission })[] = [
    { href: '/admin', label: 'Analytics', perm: 'analytics' },
    { href: '/admin/users', label: 'Users', perm: 'users' },
    { href: '/admin/staff', label: 'Staff', perm: 'staff' },
    { href: '/admin/content', label: 'Content Approval', perm: 'content' },
    { href: '/admin/categories', label: 'Categories & Homepage', perm: 'content' },
    { href: '/admin/classes', label: 'Classes', perm: 'classes' },
    { href: '/admin/courses', label: 'Courses', perm: 'courses' },
    { href: '/admin/sales', label: 'Sales', perm: 'sales' },
    { href: '/admin/revenue', label: 'Revenue', perm: 'revenue' },
    { href: '/admin/attendance', label: 'Attendance', perm: 'attendance' },
    { href: '/admin/requests', label: 'Requests', perm: 'requests' },
    { href: '/admin/students', label: 'Student Lookup', perm: 'students' },
    { href: '/admin/exams', label: 'Exams', perm: 'exams' },
    { href: '/admin/certificates', label: 'Certificates', perm: 'certificates' },
    { href: '/admin/communications', label: 'Communications', perm: 'communications' },
    { href: '/admin/settings', label: 'Settings', perm: 'settings' },
    { href: '/admin/activity-logs', label: 'Activity Logs', perm: 'activity_logs' },
    { href: '/admin/data-privacy', label: 'Data Privacy', perm: 'data_privacy' },
    { href: '/admin/recycle-bin', label: 'Recycle Bin', perm: 'recycle_bin' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = await requireRole('main_admin', 'manager', 'teacher_admin');
    const nav = ADMIN_NAV.filter((item) => user.perms.includes(item.perm)).map(
        ({ href, label }) => ({ href, label }),
    );
    return (
        <AuthProvider user={user}>
            <DashboardShell
                title="Admin"
                nav={nav}
                userName={user.name ?? user.email ?? ''}
                roleLabel={ROLE_LABELS[user.role] ?? user.role}
                uid={user.uid}
            >
                {children}
            </DashboardShell>
        </AuthProvider>
    );
}
