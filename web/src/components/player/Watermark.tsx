'use client';

import { useEffect, useState } from 'react';

/**
 * Roaming, semi-transparent watermark showing the viewer's identity + live clock.
 * It moves every few seconds so it can't be cleanly cropped out of a recording,
 * and traces any leaked capture back to the student (ported from hybridLMS).
 */
export default function Watermark({ label }: { label: string }) {
    const [pos, setPos] = useState({ top: '12%', left: '8%' });
    const [clock, setClock] = useState('');

    useEffect(() => {
        const move = () => {
            setPos({
                top: `${8 + Math.floor(Math.random() * 78)}%`,
                left: `${5 + Math.floor(Math.random() * 70)}%`,
            });
            setClock(new Date().toLocaleTimeString());
        };
        move();
        const timer = window.setInterval(move, 4000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none">
            <span
                className="absolute whitespace-nowrap text-xs font-semibold text-white/40 drop-shadow"
                style={{ top: pos.top, left: pos.left, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}
            >
                {label} · {clock}
            </span>
        </div>
    );
}
