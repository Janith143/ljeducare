'use client';

import { useEffect, useState } from 'react';

/**
 * The student's personal QR — shown at the kiosk / front desk to mark attendance.
 * Encodes the business student id (LJE####XX) when present, falling back to the uid.
 * markAttendance resolves either form.
 */
export default function StudentQrCard({ uid, studentId, name }: { uid: string; studentId?: string; name: string }) {
    const code = studentId?.trim() || uid;
    const [dataUrl, setDataUrl] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { toDataURL } = await import('qrcode');
            const url = await toDataURL(code, { width: 240, margin: 1 });
            if (!cancelled) setDataUrl(url);
        })();
        return () => {
            cancelled = true;
        };
    }, [code]);

    return (
        <div className="card flex flex-col items-center gap-2 text-center">
            <h2 className="font-semibold">My attendance QR</h2>
            {dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataUrl} alt={`Attendance QR for ${name}`} className="h-56 w-56 rounded-lg bg-white p-2" />
            ) : (
                <span className="flex h-56 w-56 items-center justify-center text-sm text-light-subtle dark:text-dark-subtle">
                    Generating…
                </span>
            )}
            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                Show this at the front desk to be marked present. ID:{' '}
                <span className="font-mono">{studentId?.trim() ? studentId : `${uid.slice(0, 12)}…`}</span>
            </p>
        </div>
    );
}
