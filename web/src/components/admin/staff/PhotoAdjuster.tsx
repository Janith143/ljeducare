'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';

const VIEW = 224; // on-screen crop circle (px)
const OUT = 512; // saved square photo (px)

type Pos = { x: number; y: number };

const NUDGE: Record<string, [number, number] | undefined> = {
    ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8],
};

/** Scale at which the photo just covers the circle, times the chosen zoom. */
const scaleOf = (img: HTMLImageElement, zoom: number) =>
    Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight) * zoom;

/** Keep the photo covering the whole circle — never an empty edge. */
function clamp(img: HTMLImageElement, zoom: number, p: Pos): Pos {
    const s = scaleOf(img, zoom);
    return {
        x: Math.min(0, Math.max(VIEW - img.naturalWidth * s, p.x)),
        y: Math.min(0, Math.max(VIEW - img.naturalHeight * s, p.y)),
    };
}

/**
 * Choose a photo, drag and zoom it inside the circle, save a square JPEG — so a face
 * sits right in every round avatar. The current photo loads through /_next/image: same
 * origin, so the canvas may export it (Storage download URLs send no CORS headers).
 */
export default function PhotoAdjuster({
    current,
    busy,
    onSave,
    onRemove,
    onCancel,
}: {
    current: string;
    busy: boolean;
    onSave: (photo: Blob) => void;
    onRemove: () => void;
    onCancel: () => void;
}) {
    const [src, setSrc] = useState(current ? `/_next/image?url=${encodeURIComponent(current)}&w=1080&q=75` : '');
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
    const [error, setError] = useState<string | null>(null);
    const drag = useRef<Pos | null>(null);

    useEffect(() => {
        if (!src) return;
        let live = true;
        const el = new Image();
        el.onload = () => {
            if (!live) return;
            const s = scaleOf(el, 1);
            setImg(el);
            setZoom(1);
            setPos({ x: (VIEW - el.naturalWidth * s) / 2, y: (VIEW - el.naturalHeight * s) / 2 });
        };
        el.onerror = () => live && setError('This photo can’t be loaded here — choose a new one.');
        el.src = src;
        return () => { live = false; };
    }, [src]);

    function zoomTo(next: number) {
        if (!img) return;
        // Zoom around the middle of the circle, not the photo's corner.
        const s0 = scaleOf(img, zoom);
        const s1 = scaleOf(img, next);
        const cx = (VIEW / 2 - pos.x) / s0;
        const cy = (VIEW / 2 - pos.y) / s0;
        setZoom(next);
        setPos(clamp(img, next, { x: VIEW / 2 - cx * s1, y: VIEW / 2 - cy * s1 }));
    }

    function nudge(e: React.KeyboardEvent) {
        const step = NUDGE[e.key];
        if (!step || !img) return;
        e.preventDefault();
        setPos(clamp(img, zoom, { x: pos.x + step[0], y: pos.y + step[1] }));
    }

    function save() {
        if (!img) return;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = OUT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return setError('Your browser can’t edit photos.');
        const k = OUT / VIEW;
        const s = scaleOf(img, zoom) * k;
        ctx.fillStyle = '#fff'; // transparent PNGs would turn black as JPEG
        ctx.fillRect(0, 0, OUT, OUT);
        ctx.drawImage(img, pos.x * k, pos.y * k, img.naturalWidth * s, img.naturalHeight * s);
        try {
            canvas.toBlob((blob) => (blob ? onSave(blob) : setError('Could not prepare the photo.')), 'image/jpeg', 0.9);
        } catch {
            setError('This photo can’t be edited here — choose a new one.');
        }
    }

    const s = img ? scaleOf(img, zoom) : 1;
    return (
        <div className="flex flex-wrap items-start gap-6">
            <div
                role="group"
                aria-label="Photo position — drag, or use the arrow keys"
                tabIndex={img ? 0 : -1}
                className="relative shrink-0 cursor-move touch-none overflow-hidden rounded-full bg-primary/10 ring-2 ring-primary/30 focus:outline-none focus-visible:ring-4"
                style={{ width: VIEW, height: VIEW }}
                onPointerDown={(e) => {
                    if (!img) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    drag.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
                }}
                onPointerMove={(e) => {
                    if (drag.current && img) setPos(clamp(img, zoom, { x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }));
                }}
                onPointerUp={() => { drag.current = null; }}
                onPointerCancel={() => { drag.current = null; }}
                onKeyDown={nudge}
            >
                {img ? (
                    <img
                        src={img.src}
                        alt=""
                        draggable={false}
                        className="pointer-events-none absolute max-w-none select-none"
                        style={{ left: pos.x, top: pos.y, width: img.naturalWidth * s, height: img.naturalHeight * s }}
                    />
                ) : (
                    <span className="flex h-full w-full items-center justify-center p-6 text-center text-xs text-light-subtle dark:text-dark-subtle">
                        {src && !error ? 'Loading…' : 'No photo yet — choose one'}
                    </span>
                )}
            </div>

            <div className="min-w-[12rem] flex-1 space-y-3">
                <label className="block text-sm">
                    <span className="mb-1 block font-medium">Photo</span>
                    <input
                        type="file"
                        accept="image/*"
                        disabled={busy}
                        className="block w-full text-xs"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setError(null);
                            setImg(null);
                            setSrc(URL.createObjectURL(f));
                        }}
                    />
                </label>
                <label className="block text-sm">
                    <span className="mb-1 block font-medium">Zoom</span>
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        disabled={!img || busy}
                        onChange={(e) => zoomTo(Number(e.target.value))}
                        className="w-full"
                    />
                </label>
                <p className="text-xs text-light-subtle dark:text-dark-subtle">
                    Drag the photo (or use the arrow keys) until the face sits in the middle of the circle.
                </p>
                {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={save} disabled={!img || busy} className="btn-primary px-3 py-1.5 text-sm">
                        {busy ? 'Saving…' : 'Save photo'}
                    </button>
                    {current && (
                        <button type="button" onClick={onRemove} disabled={busy} className="btn-secondary px-3 py-1.5 text-sm">
                            Remove photo
                        </button>
                    )}
                    <button type="button" onClick={onCancel} disabled={busy} className="text-sm text-light-subtle hover:underline dark:text-dark-subtle">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
