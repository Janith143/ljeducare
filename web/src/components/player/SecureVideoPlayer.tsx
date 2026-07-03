'use client';

import { useMemo } from 'react';
import { toEmbed } from '@/lib/videoEmbed';
import Watermark from './Watermark';
import { useVideoSecurity } from './useVideoSecurity';

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

    // For YouTube, harden the embed params (no related videos, minimal branding,
    // keyboard disabled, no fullscreen-to-youtube). The overscan crop hides the
    // title bar + "watch on YouTube" affordance.
    const ytSrc =
        embed.kind === 'youtube'
            ? `${embed.src}${embed.src.includes('?') ? '&' : '?'}rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&fs=0&playsinline=1`
            : embed.src;

    return (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            {embed.kind === 'youtube' ? (
                <iframe
                    src={ytSrc}
                    title={title ?? 'Recording'}
                    className="absolute inset-0 h-[125%] w-[125%] -translate-x-[10%] -translate-y-[10%]"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    // no allowFullScreen → keeps the viewer inside our chrome
                    referrerPolicy="no-referrer"
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
