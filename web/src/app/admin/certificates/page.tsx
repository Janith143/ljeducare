import Link from 'next/link';
import type { Certificate, Course, User } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import IssueCertificateForm, { type CourseOption } from '@/components/admin/certificates/IssueCertificateForm';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminCertificatesPage() {
    await requirePermission('certificates');
    const db = adminDb();

    const [coursesSnap, studentsSnap, certsSnap] = await Promise.all([
        db.collection(COLLECTIONS.COURSES).get(),
        db.collection(COLLECTIONS.USERS).where('role', '==', 'student').get(),
        db.collection(COLLECTIONS.CERTIFICATES).get(),
    ]);

    const students = studentsSnap.docs.map((d) => ({ ...(d.data() as User), id: d.id }));
    const courseOptions: CourseOption[] = coursesSnap.docs
        .map((d) => ({ ...(d.data() as Course), id: d.id }))
        .filter((c) => !c.isDeleted)
        .map((course) => ({
            id: course.id,
            title: course.title,
            students: students
                .filter((s) => (s.enrolledCourseIds ?? []).map(String).includes(course.id))
                .map((s) => [s.id, `${s.firstName} ${s.lastName}`.trim()] as [string, string]),
        }));

    const certificates = certsSnap.docs
        .map((d) => d.data() as Certificate)
        .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Certificates</h1>
            <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
                <IssueCertificateForm courses={courseOptions} />
                <section className="space-y-2">
                    <h2 className="font-semibold">Issued certificates ({certificates.length})</h2>
                    {certificates.length ? (
                        <div className="card overflow-x-auto p-0">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-light-border text-left dark:border-dark-border">
                                        <th className="p-3">Issued</th>
                                        <th className="p-3">Student</th>
                                        <th className="p-3">Course</th>
                                        <th className="p-3">Verification ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {certificates.map((cert) => (
                                        <tr key={cert.verificationId} className="border-b border-light-border dark:border-dark-border">
                                            <td className="p-3 whitespace-nowrap">{cert.issuedAt.slice(0, 10)}</td>
                                            <td className="p-3">{cert.studentName}</td>
                                            <td className="p-3">{cert.itemTitle}</td>
                                            <td className="p-3">
                                                <Link href={`/verify/${cert.verificationId}`} className="font-mono text-primary hover:underline">
                                                    {cert.verificationId}
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="card text-sm text-light-subtle dark:text-dark-subtle">None issued yet.</p>
                    )}
                </section>
            </div>
        </div>
    );
}
