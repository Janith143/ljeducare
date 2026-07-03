import { COLLECTIONS } from '@ljeducare/shared';
import StudentQrCard from '@/components/student/StudentQrCard';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function StudentAttendancePage() {
    const user = await requireRole('student');

    const snap = await adminDb()
        .collection(COLLECTIONS.ATTENDANCE)
        .where('studentId', '==', user.uid)
        .get();
    const records = snap.docs
        .map((d) => d.data())
        .sort((a, b) => (b.attendedAt as string).localeCompare(a.attendedAt as string));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Attendance</h1>
            <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_1fr]">
                <StudentQrCard uid={user.uid} name={user.name ?? ''} />
                <section className="space-y-2">
                    <h2 className="font-semibold">My attendance history ({records.length})</h2>
                    {records.length ? (
                        <div className="card overflow-x-auto p-0">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-light-border text-left dark:border-dark-border">
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Class</th>
                                        <th className="p-3">Payment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((r) => (
                                        <tr key={r.id as string} className="border-b border-light-border dark:border-dark-border">
                                            <td className="p-3 whitespace-nowrap">{r.sessionDate as string}</td>
                                            <td className="p-3">{r.classTitle as string}</td>
                                            <td className="p-3">
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.paymentStatus === 'unpaid' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'}`}>
                                                    {r.paymentStatus as string}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                            No attendance records yet.
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}
