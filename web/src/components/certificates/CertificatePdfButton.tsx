'use client';

import { useState } from 'react';

export interface CertData {
    studentName: string;
    itemTitle: string;
    teacherName: string;
    issuedAt: string;
    verificationId: string;
}

/** Generate + download a printable A4 landscape certificate PDF (client-side). */
export default function CertificatePdfButton({
    cert,
    siteName,
    siteUrl,
    className = 'btn-primary px-3 py-1 text-xs',
}: {
    cert: CertData;
    siteName: string;
    siteUrl: string;
    className?: string;
}) {
    const [busy, setBusy] = useState(false);

    async function download() {
        setBusy(true);
        try {
            const { jsPDF } = await import('jspdf');
            const { toDataURL } = await import('qrcode');
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const w = doc.internal.pageSize.getWidth();
            const h = doc.internal.pageSize.getHeight();

            // Border
            doc.setDrawColor(59, 130, 246);
            doc.setLineWidth(1.5);
            doc.rect(10, 10, w - 20, h - 20);
            doc.setLineWidth(0.4);
            doc.rect(14, 14, w - 28, h - 28);

            doc.setTextColor(59, 130, 246);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(26);
            doc.text(siteName, w / 2, 34, { align: 'center' });

            doc.setTextColor(40, 40, 40);
            doc.setFontSize(18);
            doc.text('Certificate of Completion', w / 2, 52, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.text('This is proudly presented to', w / 2, 70, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(30);
            doc.text(cert.studentName, w / 2, 88, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.text('for successfully completing the course', w / 2, 102, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text(cert.itemTitle, w / 2, 114, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(90, 90, 90);
            if (cert.teacherName) doc.text(`Instructor: ${cert.teacherName}`, w / 2, 126, { align: 'center' });
            doc.text(`Issued: ${cert.issuedAt.slice(0, 10)}`, w / 2, 133, { align: 'center' });

            // Verification block + QR
            const verifyUrl = `${siteUrl}/verify/${cert.verificationId}`;
            const qr = await toDataURL(verifyUrl, { width: 120, margin: 0 });
            doc.addImage(qr, 'PNG', w - 48, h - 48, 26, 26);
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(`Verify at ${siteUrl}/verify`, 22, h - 30);
            doc.setFont('courier', 'normal');
            doc.text(cert.verificationId, 22, h - 24);

            doc.save(`certificate-${cert.verificationId}.pdf`);
        } finally {
            setBusy(false);
        }
    }

    return (
        <button type="button" onClick={download} disabled={busy} className={className}>
            {busy ? 'Generating…' : '⬇ Download PDF'}
        </button>
    );
}
