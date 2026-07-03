import Link from 'next/link';
import type { User } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/** Student lookup — search by name, email, mobile or guardian phone. */
export default async function AdminStudentsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    await requirePermission('students');
    const { q } = await searchParams;
    const query = (q ?? '').trim().toLowerCase();

    const snap = await adminDb().collection(COLLECTIONS.USERS).where('role', '==', 'student').get();
    const all = snap.docs.map((d) => ({ ...(d.data() as User), id: d.id }));
    const results = query
        ? all.filter((s) =>
              [s.firstName, s.lastName, s.email, s.contactNumber, s.guardianPhone, `${s.firstName} ${s.lastName}`]
                  .filter(Boolean)
                  .some((v) => String(v).toLowerCase().includes(query)),
          )
        : [];

    const enrolledCount = (s: User) =>
        (s.enrolledClassIds?.length ?? 0) + (s.enrolledCourseIds?.length ?? 0) + (s.enrolledQuizIds?.length ?? 0);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Student Lookup</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Search by name, email, mobile number or guardian phone. {all.length} students total.
            </p>

            <form action="/admin/students" method="GET" className="card flex gap-2">
                <input
                    name="q"
                    defaultValue={q}
                    placeholder="Search students…"
                    className="input flex-1"
                    autoFocus
                />
                <button type="submit" className="btn-primary px-6">Search</button>
            </form>

            {query && (
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    {results.length} match{results.length === 1 ? '' : 'es'} for &ldquo;{q}&rdquo;
                </p>
            )}

            {results.length > 0 && (
                <div className="card overflow-x-auto p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-light-border text-left dark:border-dark-border">
                                <th className="p-3">Name</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Mobile</th>
                                <th className="p-3">Guardian</th>
                                <th className="p-3">Enrollments</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((s) => (
                                <tr key={s.id} className="border-b border-light-border dark:border-dark-border">
                                    <td className="p-3 font-medium">{s.firstName} {s.lastName}</td>
                                    <td className="p-3 text-light-subtle dark:text-dark-subtle">{s.email}</td>
                                    <td className="p-3">{s.contactNumber || '—'}</td>
                                    <td className="p-3">{s.guardianPhone || '—'}</td>
                                    <td className="p-3">{enrolledCount(s)}</td>
                                    <td className="p-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'suspended' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'}`}>
                                            {s.status ?? 'active'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {query && results.length === 0 && (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                    No students match that search. Try a partial name or number.
                </p>
            )}

            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                Manage roles and account status from <Link href="/admin/users" className="text-primary hover:underline">Users</Link>.
            </p>
        </div>
    );
}
