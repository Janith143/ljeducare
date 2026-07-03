import Link from 'next/link';
import type { Certificate } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import { requireRole } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function StudentCertificatesPage() {
    const user = await requireRole('student');

    const snap = await adminDb()
        .collection(COLLECTIONS.CERTIFICATES)
        .where('studentId', '==', user.uid)
        .get();
    const certificates = snap.docs
        .map((d) => d.data() as Certificate)
        .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">My Certificates</h1>
            {certificates.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    {certificates.map((cert) => (
                        <div key={cert.verificationId} className="card space-y-2">
                            <span className="text-3xl">🎓</span>
                            <h2 className="font-semibold">{cert.itemTitle}</h2>
                            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                                {cert.teacherName ? `Taught by ${cert.teacherName} · ` : ''}
                                Issued {cert.issuedAt.slice(0, 10)}
                            </p>
                            <p className="font-mono text-sm">{cert.verificationId}</p>
                            <Link
                                href={`/verify/${cert.verificationId}`}
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                Public verification page →
                            </Link>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                    No certificates yet — complete a course to earn one.
                </p>
            )}
        </div>
    );
}
