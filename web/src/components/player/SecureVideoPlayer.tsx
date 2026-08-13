'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toEmbed } from '@/lib/videoEmbed';
import Watermark from './Watermark';
import { useVideoSecurity } from './useVideoSecurity';

// Minimal typing for the bits of the YouTube IFrame Player API this file uses.
declare global {
    interface Window {
        onYouTubeIframeAPIReady?: () => void;
        YT?: { Player: new (el: HTMLElement, opts: { events: { onError: (e: { data: number }) => void } }) => { destroy: () => void } };
    }
}

/**
 * Protected player for enrolled-only recordings + course lessons.
 * Wraps a YouTube embed or direct <video> with the anti-piracy layer:
 * identity watermark, right-click/devtools blocking, screen-record/tab-switch
 * pause, no native download, and hidden YouTube branding.
 */
export default function SecureVideoPlayer({
    url,
    watermark,
    title,
}: {
    url: string;
    watermark: string;
    title?: string;
}) {
    const embed = useMemo(() => toEmbed(url), [url]);
    const { blocked, reason } = useVideoSecurity(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const playerRef = useRef<{ destroy: () => void } | null>(null);
    const [ytError, setYtError] = useState(false);

    // For YouTube: no related videos, minimal branding, keyboard disabled, no
    // fullscreen-to-youtube. `enablejsapi=1` lets the IFrame Player API attach to
    // this exact iframe below so a playback error can be caught instead of leaving
    // YouTube's own error page (with its live "Watch on YouTube" link) exposed.
    // referrerPolicy is deliberately NOT "no-referrer": YouTube's embed endpoint
    // rejects referrer-less requests with its own "Error 153" page, which is what
    // was showing through here — https://developers.google.com/youtube/iframe_api_reference.
    const ytSrc =
        embed.kind === 'youtube'
            ? `${embed.src}?rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&fs=0&playsinline=1&enablejsapi=1`
            : embed.src;

    // Attach the IFrame Player API to the existing <iframe> purely to get onError —
    // no custom controls here, YouTube's native ones still drive playback.
    useEffect(() => {
        if (embed.kind !== 'youtube') return undefined;
        setYtError(false);

        let cancelled = false;
        const attach = () => {
            if (cancelled || !window.YT || !iframeRef.current) return;
            playerRef.current = new window.YT.Player(iframeRef.current, {
                events: { onError: () => setYtError(true) },
            });
        };

        if (window.YT?.Player) {
            attach();
        } else {
            const prev = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                prev?.();
                attach();
            };
            if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                document.body.appendChild(tag);
            }
        }

        return () => {
            cancelled = true;
            playerRef.current?.destroy();
            playerRef.current = null;
        };
    }, [embed.kind, embed.src]);

    return (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            {embed.kind === 'youtube' && ytError ? (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white/70">
                    This video couldn&apos;t be loaded. Please refresh, or contact support if it keeps happening.
                </div>
            ) : embed.kind === 'youtube' ? (
                <iframe
                    ref={iframeRef}
                    src={ytSrc}
                    title={title ?? 'Recording'}
                    className="absolute inset-0 h-[125%] w-[125%] -translate-x-[10%] -translate-y-[10%]"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    // no allowFullScreen → keeps the viewer inside our chrome
                    referrerPolicy="strict-origin-when-cross-origin"
                />
            ) : embed.kind === 'video' ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                    src={embed.src}
                    controls
                    controlsList="nodownload noplaybackrate"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                    className="absolute inset-0 h-full w-full bg-black"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white/70">
                    This recording can&apos;t be embedded securely.
                </div>
            )}

            <Watermark label={watermark} />

            {blocked && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/95 p-6 text-center">
                    <span className="text-3xl">⏸️</span>
                    <p className="font-semibold text-white">{reason}</p>
                    <p className="text-xs text-white/60">
                        This lesson is licensed to {watermark}. Recording or sharing is prohibited.
                    </p>
                </div>
            )}
        </div>
    );
}
