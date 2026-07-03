import type { Metadata } from 'next';
import { COLLECTIONS, type Certificate } from '@ljeducare/shared';
import { adminDb } from '@/lib/firebase/admin';
import { SITE } from '@/lib/site';

// Live-accurate — verification must never serve stale data.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Verify Certificate' };

export default async function VerifyCertificatePage({
    params,
}: {
    params: Promise<{ certificateId: string }>;
}) {
    const { certificateId } = await params;
    const id = decodeURIComponent(certificateId).trim().toUpperCase();

    const snap = await adminDb()
        .collection(COLLECTIONS.CERTIFICATES)
        .where('verificationId', '==', id)
        .limit(1)
        .get();
    const cert = snap.empty ? null : (snap.docs[0].data() as Certificate);

    return (
        <div className="mx-auto max-w-lg space-y-6 px-4 py-16 text-center">
            <h1 className="text-2xl font-bold">Certificate Verification</h1>
            {cert ? (
                <div className="card space-y-4 border-green-300 p-8">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</span>
                    <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                        This certificate is authentic
                    </p>
                    <dl className="space-y-2 text-left text-sm">
                        <Row label="Certificate ID" value={cert.verificationId} mono />
                        <Row label="Issued to" value={cert.studentName} />
                        <Row label="Course" value={cert.itemTitle} />
                        <Row label="Teacher" value={cert.teacherName || '—'} />
                        <Row label="Issued on" value={cert.issuedAt.slice(0, 10)} />
                        <Row label="Issued by" value={SITE.name} />
                    </dl>
                </div>
            ) : (
                <div className="card space-y-4 border-red-300 p-8">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">✕</span>
                    <p className="text-lg font-semibold text-red-700 dark:text-red-300">
                        Not a valid certificate
                    </p>
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">
                        No certificate with ID <span className="font-mono">{id}</span> was issued by{' '}
                        {SITE.name}. Check the ID for typos, or contact the institute office.
                    </p>
                </div>
            )}
        </div>
    );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex justify-between gap-4">
            <dt className="text-light-subtle dark:text-dark-subtle">{label}</dt>
            <dd className={`font-medium ${mono ? 'font-mono' : ''}`}>{value}</dd>
        </div>
    );
}
