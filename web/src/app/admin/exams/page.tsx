import Link from 'next/link';
import type { LiveClass, StaffMember } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/** Institute-wide view of exam results recorded on classes. */
export default async function AdminExamsPage() {
    await requirePermission('exams');
    const db = adminDb();

    const [classesSnap, staffSnap] = await Promise.all([
        db.collection(COLLECTIONS.CLASSES).get(),
        db.collection(COLLECTIONS.STAFF).get(),
    ]);
    const teacherName: Record<string, string> = {};
    staffSnap.docs.forEach((d) => { teacherName[d.id] = (d.data() as StaffMember).name; });

    const rows = classesSnap.docs
        .map((d) => ({ ...(d.data() as LiveClass), id: d.id }))
        .filter((c) => !c.isDeleted && (c.examResults?.length ?? 0) > 0)
        .flatMap((cls) =>
            (cls.examResults ?? []).map((exam) => {
                const scores = exam.studentScores ?? [];
                const avg = scores.length
                    ? Math.round((scores.reduce((a, s) => a + s.score, 0) / scores.length / exam.maxMark) * 100)
                    : 0;
                return {
                    key: `${cls.id}-${exam.id}`,
                    classTitle: cls.title,
                    teacher: teacherName[cls.teacherId ?? ''] ?? '—',
                    name: exam.name,
                    category: exam.category,
                    date: exam.date,
                    maxMark: exam.maxMark,
                    count: scores.length,
                    avgPct: avg,
                };
            }),
        )
        .sort((a, b) => b.date.localeCompare(a.date));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Exams</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                All exam results recorded across classes. Teachers enter these from their{' '}
                <Link href="/teacher/exams" className="text-primary hover:underline">Exam Results</Link> tab.
            </p>

            {rows.length ? (
                <div className="card overflow-x-auto p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-light-border text-left dark:border-dark-border">
                                <th className="p-3">Date</th>
                                <th className="p-3">Exam</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Class</th>
                                <th className="p-3">Teacher</th>
                                <th className="p-3">Students</th>
                                <th className="p-3">Avg %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.key} className="border-b border-light-border dark:border-dark-border">
                                    <td className="p-3 whitespace-nowrap">{r.date}</td>
                                    <td className="p-3 font-medium">{r.name}</td>
                                    <td className="p-3">{r.category}</td>
                                    <td className="p-3">{r.classTitle}</td>
                                    <td className="p-3 text-light-subtle dark:text-dark-subtle">{r.teacher}</td>
                                    <td className="p-3">{r.count}</td>
                                    <td className="p-3 font-semibold text-primary">{r.avgPct}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                    No exam results recorded yet.
                </p>
            )}
        </div>
    );
}
