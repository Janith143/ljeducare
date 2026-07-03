'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * QR scanning via the native BarcodeDetector API (Chrome/Edge/Android tablets —
 * the typical kiosk hardware). Falls back to manual entry elsewhere.
 */
export default function KioskCameraScanner({
    onScan,
    disabled,
}: {
    onScan: (value: string) => void;
    disabled: boolean;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [active, setActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastScanRef = useRef<{ value: string; at: number }>({ value: '', at: 0 });

    useEffect(() => {
        if (!active) return;
        let stream: MediaStream | null = null;
        let timer: ReturnType<typeof setInterval> | null = null;
        let cancelled = false;

        (async () => {
            try {
                const DetectorCtor = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> } }).BarcodeDetector;
                if (!DetectorCtor) {
                    setError('Camera scanning is not supported in this browser — type the ID instead.');
                    setActive(false);
                    return;
                }
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (cancelled || !videoRef.current) return;
                videoRef.current.srcObject = stream;
                await videoRef.current.play();

                const detector = new DetectorCtor({ formats: ['qr_code'] });
                timer = setInterval(async () => {
                    if (!videoRef.current || disabled) return;
                    try {
                        const codes = await detector.detect(videoRef.current);
                        const value = codes[0]?.rawValue?.trim();
                        if (!value) return;
                        // Debounce: same code within 4s is one scan.
                        const now = Date.now();
                        if (lastScanRef.current.value === value && now - lastScanRef.current.at < 4000) return;
                        lastScanRef.current = { value, at: now };
                        onScan(value);
                    } catch {
                        /* detection errors are transient */
                    }
                }, 500);
            } catch {
                setError('Camera access denied — type the ID instead.');
                setActive(false);
            }
        })();

        return () => {
            cancelled = true;
            if (timer) clearInterval(timer);
            stream?.getTracks().forEach((t) => t.stop());
        };
    }, [active, disabled, onScan]);

    return (
        <div className="card space-y-2">
            {error && <p className="text-xs text-amber-700 dark:text-amber-300">{error}</p>}
            {active ? (
                <>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video ref={videoRef} className="aspect-video w-full rounded-lg bg-black object-cover" />
                    <button type="button" onClick={() => setActive(false)} className="btn-secondary w-full text-sm">
                        Stop camera
                    </button>
                </>
            ) : (
                <button type="button" onClick={() => { setError(null); setActive(true); }} className="btn-secondary w-full py-3">
                    📷 Scan student QR with camera
                </button>
            )}
        </div>
    );
}
