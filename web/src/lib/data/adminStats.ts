import 'server-only';

import type { Sale, User } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { adminDb } from '@/lib/firebase/admin';

export interface AdminStats {
    studentCount: number;
    teacherCount: number;
    publishedClasses: number;
    publishedCourses: number;
    salesThisMonth: number;      // completed count
    revenueThisMonth: number;    // LKR baseAmount sum
    revenueAllTime: number;
    pendingSlips: number;
}

/** KPI aggregates for /admin. Fine at institute scale; swap for counters if it grows. */
export async function getAdminStats(): Promise<AdminStats> {
    const db = adminDb();
    const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;

    const [users, classes, courses, sales] = await Promise.all([
        db.collection(COLLECTIONS.USERS).get(),
        db.collection(COLLECTIONS.CLASSES).where('isPublished', '==', true).get(),
        db.collection(COLLECTIONS.COURSES).where('isPublished', '==', true).get(),
        db.collection(COLLECTIONS.SALES).get(),
    ]);

    let salesThisMonth = 0;
    let revenueThisMonth = 0;
    let revenueAllTime = 0;
    let pendingSlips = 0;
    sales.docs.forEach((d) => {
        const s = d.data() as Sale;
        if (s.status === 'pending_slip') pendingSlips++;
        if (s.status !== 'completed') return;
        revenueAllTime += s.baseAmount || 0;
        if (s.saleDate >= monthStart) {
            salesThisMonth++;
            revenueThisMonth += s.baseAmount || 0;
        }
    });

    const byRole = (role: string) =>
        users.docs.filter((d) => (d.data() as User).role === role).length;

    return {
        studentCount: byRole('student'),
        teacherCount: byRole('teacher') + byRole('teacher_admin'),
        publishedClasses: classes.docs.filter((d) => !d.data().isDeleted).length,
        publishedCourses: courses.docs.filter((d) => !d.data().isDeleted).length,
        salesThisMonth,
        revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
        revenueAllTime: Math.round(revenueAllTime * 100) / 100,
        pendingSlips,
    };
}

/** All sales, newest first (admin Sales tab). */
export async function listAllSales(limit = 200): Promise<Sale[]> {
    const snap = await adminDb().collection(COLLECTIONS.SALES).get();
    return snap.docs
        .map((d) => d.data() as Sale)
        .sort((a, b) => b.saleDate.localeCompare(a.saleDate))
        .slice(0, limit);
}

/** All users (admin Users tab). */
export async function listAllUsers(): Promise<User[]> {
    const snap = await adminDb().collection(COLLECTIONS.USERS).get();
    return snap.docs
        .map((d) => ({ ...(d.data() as User), id: d.id }))
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}
