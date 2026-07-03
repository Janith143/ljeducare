import Link from 'next/link';
import { formatCurrencyCompact } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { getAdminStats } from '@/lib/data/adminStats';

export const dynamic = 'force-dynamic';

const lkr = (amount: number) => formatCurrencyCompact({ amount, currency: 'LKR' });

export default async function AdminAnalyticsPage() {
    await requirePermission('analytics');
    const stats = await getAdminStats();

    const cards = [
        { label: 'Students', value: String(stats.studentCount), href: '/admin/users' },
        { label: 'Teachers', value: String(stats.teacherCount), href: '/admin/staff' },
        { label: 'Published classes', value: String(stats.publishedClasses), href: '/admin/classes' },
        { label: 'Published courses', value: String(stats.publishedCourses), href: '/admin/courses' },
        { label: 'Sales this month', value: String(stats.salesThisMonth), href: '/admin/sales' },
        { label: 'Revenue this month', value: lkr(stats.revenueThisMonth), href: '/admin/revenue' },
        { label: 'Revenue all-time', value: lkr(stats.revenueAllTime), href: '/admin/revenue' },
        { label: 'Slips awaiting approval', value: String(stats.pendingSlips), href: '/admin/requests', alert: stats.pendingSlips > 0 },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Analytics</h1>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <Link key={card.label} href={card.href} className={`card transition-shadow hover:shadow-md ${card.alert ? 'border-amber-400' : ''}`}>
                        <p className="text-sm text-light-subtle dark:text-dark-subtle">{card.label}</p>
                        <p className="mt-1 text-2xl font-bold">{card.value}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
