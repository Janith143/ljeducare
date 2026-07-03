'use client';

import { useEffect, useState } from 'react';

/**
 * Anti-piracy protections for protected video playback, ported from the
 * hybridLMS YouTubePlayer. Returns a `blocked` flag + reason; the player pauses
 * and overlays a message while blocked.
 *
 * Covers: right-click block, devtools-shortcut block, screen-record / tab-switch
 * detection (blur + visibilitychange → pause), and docked/mobile devtools
 * detection. Intentionally pauses (not a hard page-wipe) so a genuine student
 * who alt-tabs just resumes on return.
 */
export function useVideoSecurity(active: boolean): { blocked: boolean; reason: string } {
    const [blocked, setBlocked] = useState(false);
    const [reason, setReason] = useState('');

    // Right-click + devtools keyboard shortcuts (document-wide while mounted).
    useEffect(() => {
        if (!active) return;
        const onContextMenu = (e: MouseEvent) => e.preventDefault();
        const onKeyDown = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(k)) ||
                (e.ctrlKey && k === 'u') ||
                (e.ctrlKey && k === 's')
            ) {
                e.preventDefault();
            }
        };
        document.addEventListener('contextmenu', onContextMenu);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('contextmenu', onContextMenu);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [active]);

    // Screen-record / tab-switch → pause. Returning to the tab clears it.
    useEffect(() => {
        if (!active) return;
        const block = (r: string) => {
            setBlocked(true);
            setReason(r);
        };
        const onHidden = () => block('Playback paused — return to this tab to continue.');
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') onHidden();
            else setBlocked(false);
        };
        const onFocus = () => setBlocked(false);
        window.addEventListener('blur', onHidden);
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('blur', onHidden);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [active]);

    // Docked / mobile devtools detection → block while open.
    useEffect(() => {
        if (!active) return;
        let inIframe = false;
        try {
            inIframe = window.self !== window.top;
        } catch {
            inIframe = true;
        }
        const DEVTOOLS_MSG = 'Close developer tools to continue watching.';
        let devtoolsBlocking = false;
        const timer = window.setInterval(() => {
            const threshold = 170;
            const docked =
                !inIframe &&
                (window.outerWidth - window.innerWidth > threshold ||
                    window.outerHeight - window.innerHeight > threshold);
            const mobileTools = !!(
                (window as unknown as { eruda?: unknown }).eruda ||
                (window as unknown as { __VCONSOLE__?: unknown }).__VCONSOLE__
            );
            if (docked || mobileTools) {
                devtoolsBlocking = true;
                setBlocked(true);
                setReason(DEVTOOLS_MSG);
            } else if (devtoolsBlocking) {
                // Only clear the block WE set (don't override a tab-switch block).
                devtoolsBlocking = false;
                setBlocked(false);
                setReason('');
            }
        }, 800);
        return () => clearInterval(timer);
    }, [active]);

    return { blocked, reason };
}
