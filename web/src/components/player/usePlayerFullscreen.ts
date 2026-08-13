'use client';

import { useState, useEffect, useCallback, type RefObject } from 'react';

/**
 * Fullscreen for the protected video player (ported from hybridLMS's
 * usePlayerFullscreen — unchanged logic, generic enough to need no adaptation).
 *
 * Uses the real Element Fullscreen API where the document actually permits it
 * (desktop, Android, iPad). Everywhere it does NOT — iPhone Safari (no element
 * fullscreen at all) and cross-origin iframe embeds that lack allow="fullscreen"
 * (both report document.fullscreenEnabled === false) — it falls back to an in-page
 * "fake fullscreen" that expands the player to fill the viewport. Gating on
 * fullscreenEnabled (instead of the mere presence of requestFullscreen) is what makes
 * the fallback engage in a permission-blocked iframe, where requestFullscreen exists
 * but rejects.
 *
 * IMPORTANT: it deliberately never uses HTMLVideoElement.webkitEnterFullscreen()
 * (iOS native <video> fullscreen). That hands the raw <video> to iOS's system player,
 * which does NOT composite our sibling HTML overlays — so the anti-leak watermark
 * (student name / id / timestamp) would be stripped, letting an iPhone student
 * screen-record clean footage. Fake fullscreen keeps the overlay on top, preserving
 * the watermark on every device.
 */
export function usePlayerFullscreen(wrapperRef: RefObject<HTMLElement | null>) {
    const [isFakeFullscreen, setIsFakeFullscreen] = useState(false);
    const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

    const toggleFullscreen = useCallback(() => {
        const doc = document as unknown as Record<string, unknown>;

        // --- Exit paths ---
        if (doc.fullscreenElement || doc.webkitFullscreenElement) {
            try {
                ((document.exitFullscreen || (doc.webkitExitFullscreen as (() => Promise<void>) | undefined)) as (() => Promise<void>) | undefined)?.call(document);
            } catch {
                /* ignore */
            }
            return;
        }
        if (isFakeFullscreen) {
            setIsFakeFullscreen(false);
            return;
        }

        // --- Enter paths ---
        // Only attempt native element fullscreen when the document permits it.
        // document.fullscreenEnabled is false on iPhone Safari (no element fullscreen)
        // and inside a cross-origin iframe lacking allow="fullscreen" — in both cases a
        // requestFullscreen() call would (silently) reject, so go straight to the
        // watermark-preserving fake fullscreen instead of a dead no-op.
        const fsEnabled = (doc.fullscreenEnabled as boolean | undefined) ?? (doc.webkitFullscreenEnabled as boolean | undefined) ?? false;
        const wrapper = wrapperRef.current as unknown as Record<string, unknown> | null;
        const req = wrapper && ((wrapper.requestFullscreen || wrapper.webkitRequestFullscreen || wrapper.mozRequestFullScreen || wrapper.msRequestFullscreen) as (() => Promise<void>) | undefined);
        if (fsEnabled && wrapper && req) {
            try {
                const result = req.call(wrapper);
                // Belt-and-suspenders: if it still rejects despite fullscreenEnabled, degrade.
                if (result && typeof (result as Promise<void>).catch === 'function') {
                    (result as Promise<void>).catch(() => setIsFakeFullscreen(true));
                }
            } catch {
                setIsFakeFullscreen(true);
            }
            return;
        }

        // iPhone Safari + permission-blocked iframe + anything without a usable API.
        setIsFakeFullscreen(true);
    }, [wrapperRef, isFakeFullscreen]);

    // Track native fullscreen state so the button shows the correct enter/exit icon.
    useEffect(() => {
        const doc = document as unknown as Record<string, unknown>;
        const onChange = () => setIsNativeFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
        document.addEventListener('fullscreenchange', onChange);
        document.addEventListener('webkitfullscreenchange', onChange);
        return () => {
            document.removeEventListener('fullscreenchange', onChange);
            document.removeEventListener('webkitfullscreenchange', onChange);
        };
    }, []);

    // While fake fullscreen is active: lock body scroll and allow Esc to exit.
    useEffect(() => {
        if (!isFakeFullscreen) return undefined;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsFakeFullscreen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener('keydown', onKey);
        };
    }, [isFakeFullscreen]);

    return {
        isFakeFullscreen,
        isFullscreen: isFakeFullscreen || isNativeFullscreen,
        toggleFullscreen,
    };
}
