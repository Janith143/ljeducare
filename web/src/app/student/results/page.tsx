import type { LiveClass } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/** Student score card — exam marks (from classes) + quiz scores (submissions). */
export default async function StudentResultsPage() {
    const user = await requireRole('student');
    const db = adminDb();

    const [userDoc, submissionsSnap, classesSnap] = await Promise.all([
        db.collection(COLLECTIONS.USERS).doc(user.uid).get(),
        db.collection(COLLECTIONS.SUBMISSIONS).where('studentId', '==', user.uid).get(),
        db.collection(COLLECTIONS.CLASSES).get(),
    ]);

    const enrolledIds = new Set((userDoc.data()?.enrolledClassIds ?? []).map(String));
    const examRows = classesSnap.docs
        .map((d) => ({ ...(d.data() as LiveClass), id: d.id }))
        .filter((c) => enrolledIds.has(c.id))
        .flatMap((cls) =>
            (cls.examResults ?? [])
                .map((exam) => ({
                    key: `${cls.id}-${exam.id}`,
                    classTitle: cls.title,
                    exam: exam.name,
                    category: exam.category,
                    date: exam.date,
                    maxMark: exam.maxMark,
                    score: exam.studentScores.find((s) => s.studentId === user.uid)?.score,
                }))
                .filter((row) => row.score !== undefined),
        )
        .sort((a, b) => b.date.localeCompare(a.date));

    const quizRows = submissionsSnap.docs
        .map((d) => d.data())
        .sort((a, b) => (b.submittedAt as string).localeCompare(a.submittedAt as string));

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold">My Score Card</h1>

            <section className="space-y-2">
                <h2 className="font-semibold">Exam results ({examRows.length})</h2>
                {examRows.length ? (
                    <div className="card overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-light-border text-left dark:border-dark-border">
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Class</th>
                                    <th className="p-3">Exam</th>
                                    <th className="p-3">Category</th>
                                    <th className="p-3">Marks</th>
                                    <th className="p-3">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {examRows.map((row) => (
                                    <tr key={row.key} className="border-b border-light-border dark:border-dark-border">
                                        <td className="p-3 whitespace-nowrap">{row.date}</td>
                                        <td className="p-3">{row.classTitle}</td>
                                        <td className="p-3 font-medium">{row.exam}</td>
                                        <td className="p-3">{row.category}</td>
                                        <td className="p-3 whitespace-nowrap">
                                            {row.score} / {row.maxMark}
                                        </td>
                                        <td className="p-3 font-semibold text-primary">
                                            {Math.round(((row.score ?? 0) / row.maxMark) * 100)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="card text-sm text-light-subtle dark:text-dark-subtle">No exam results yet.</p>
                )}
            </section>

            <section className="space-y-2">
                <h2 className="font-semibold">Quiz scores ({quizRows.length})</h2>
                {quizRows.length ? (
                    <div className="card overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-light-border text-left dark:border-dark-border">
                                    <th className="p-3">Submitted</th>
                                    <th className="p-3">Quiz</th>
                                    <th className="p-3">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quizRows.map((row) => (
                                    <tr key={row.id as string} className="border-b border-light-border dark:border-dark-border">
                                        <td className="p-3 whitespace-nowrap">{(row.submittedAt as string).slice(0, 10)}</td>
                                        <td className="p-3">{(row.quizTitle as string) || (row.quizId as string)}</td>
                                        <td className="p-3 font-semibold text-primary">
                                            {row.score as number} / {(row.total as number) ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="card text-sm text-light-subtle dark:text-dark-subtle">No quiz submissions yet.</p>
                )}
            </section>
        </div>
    );
}
