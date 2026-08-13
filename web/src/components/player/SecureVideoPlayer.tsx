'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toEmbed } from '@/lib/videoEmbed';
import Watermark from './Watermark';
import { useVideoSecurity } from './useVideoSecurity';

// Minimal typing for the bits of the YouTube IFrame Player API this file uses.
interface YTPlayer {
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    setVolume(v: number): void;
    destroy(): void;
}
declare global {
    interface Window {
        onYouTubeIframeAPIReady?: () => void;
        YT?: {
            Player: new (
                el: HTMLElement,
                opts: { events: { onReady: () => void; onStateChange: (e: { data: number }) => void; onError: (e: { data: number }) => void } },
            ) => YTPlayer;
        };
    }
}

const YT_PLAYING = 1;
// Fixed HD layout box, visually scaled down to fit — YouTube auto-selects resolution
// from the player's *layout* size, not the video, so rendering small would cap quality
// (ported from hybridLMS's YouTubePlayer). Overscan crops the title bar/branding at the edges.
const HD_W = 1920;
const HD_H = 1080;
const OVERSCAN = 1.15;

function formatTime(seconds: number): string {
    if (!seconds || Number.isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    return (h > 0 ? `${h}:${mm}` : mm) + ':' + String(s).padStart(2, '0');
}

/**
 * Protected player for enrolled-only recordings + course lessons.
 * Wraps a YouTube embed or direct <video> with the anti-piracy layer:
 * identity watermark, right-click/devtools blocking, screen-record/tab-switch
 * pause, no native download, and hidden YouTube branding.
 *
 * YouTube plays inside a closed shadow root (ported from hybridLMS's YouTubePlayer)
 * so the raw iframe never appears in DevTools' Elements panel and is never directly
 * clickable — playback is entirely driven by the custom control bar below it via the
 * IFrame Player API, not by YouTube's own (now-hidden) controls.
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

    const shadowHostRef = useRef<HTMLDivElement>(null);
    const shadowRootRef = useRef<ShadowRoot | null>(null);
    const stageRef = useRef<HTMLDivElement | null>(null);
    const iframeElRef = useRef<HTMLIFrameElement | null>(null);
    const playerRef = useRef<YTPlayer | null>(null);

    const [ytError, setYtError] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTimeSec, setCurrentTimeSec] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragValue, setDragValue] = useState(0);
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);

    const applyFit = useCallback(() => {
        const host = shadowHostRef.current;
        const stage = stageRef.current;
        if (!host || !stage) return;
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (!w || !h) return;
        stage.style.setProperty('--yt-fit', String(Math.min(w / HD_W, h / HD_H) * OVERSCAN));
    }, []);

    // Build the shadow-DOM stage + a nocookie iframe (own element, not YT-generated, so the
    // privacy-enhanced domain survives) and adopt it into the IFrame Player API purely for
    // event control — re-runs whenever the video actually changes (e.g. switching lessons).
    useEffect(() => {
        if (embed.kind !== 'youtube' || !embed.videoId) return undefined;
        setYtError(false);
        setIsReady(false);
        setIsPlaying(false);
        setCurrentTimeSec(0);
        setDuration(0);

        const host = shadowHostRef.current;
        if (!host) return undefined;
        if (!shadowRootRef.current) shadowRootRef.current = host.attachShadow({ mode: 'closed' });
        const root = shadowRootRef.current;
        root.innerHTML = ''; // clear the previous lesson's iframe, if any

        const style = document.createElement('style');
        style.textContent = `
            .yt-stage { position: absolute; inset: 0; overflow: hidden; }
            .yt-frame {
                position: absolute; top: 50%; left: 50%; width: ${HD_W}px; height: ${HD_H}px; border: 0;
                transform: translate(-50%, -50%) scale(var(--yt-fit, 0.5));
                transform-origin: center center;
            }
        `;
        root.appendChild(style);

        const stage = document.createElement('div');
        stage.className = 'yt-stage';
        root.appendChild(stage);
        stageRef.current = stage;

        const iframe = document.createElement('iframe');
        iframe.className = 'yt-frame';
        iframe.title = title ?? 'Recording';
        iframe.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        const params = new URLSearchParams({
            rel: '0',
            modestbranding: '1',
            disablekb: '1',
            iv_load_policy: '3',
            fs: '0',
            playsinline: '1',
            controls: '0', // native controls hidden — the custom bar below drives playback
            enablejsapi: '1',
            origin: window.location.origin,
        });
        iframe.src = `${embed.src}?${params.toString()}`;
        stage.appendChild(iframe);
        iframeElRef.current = iframe;

        let cancelled = false;
        const attach = () => {
            if (cancelled || !window.YT?.Player || !iframeElRef.current) return;
            playerRef.current = new window.YT.Player(iframeElRef.current, {
                events: {
                    onReady: () => {
                        if (cancelled) return;
                        setIsReady(true);
                        setDuration(playerRef.current?.getDuration() ?? 0);
                        setIsMuted(!!playerRef.current?.isMuted());
                        applyFit();
                    },
                    onStateChange: (e) => {
                        if (cancelled) return;
                        setIsPlaying(e.data === YT_PLAYING);
                        if (e.data === YT_PLAYING) setDuration(playerRef.current?.getDuration() ?? 0);
                    },
                    onError: () => {
                        if (!cancelled) setYtError(true);
                    },
                },
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
    }, [embed.kind, embed.videoId, embed.src, title, applyFit]);

    // Keep the fixed HD frame scaled to fit the visible card as it resizes.
    useEffect(() => {
        const host = shadowHostRef.current;
        if (!host || embed.kind !== 'youtube') return undefined;
        applyFit();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(applyFit) : null;
        ro?.observe(host);
        window.addEventListener('resize', applyFit);
        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', applyFit);
        };
    }, [applyFit, embed.kind]);

    // Poll playback position while playing (the API has no timeupdate event).
    useEffect(() => {
        if (!isPlaying) return undefined;
        const id = window.setInterval(() => {
            if (!isDragging) setCurrentTimeSec(playerRef.current?.getCurrentTime() ?? 0);
        }, 500);
        return () => clearInterval(id);
    }, [isPlaying, isDragging]);

    // The anti-piracy hook (right-click/devtools/tab-switch) only tracked a `blocked` flag
    // before this player had a real player reference to act on — now it actually pauses.
    useEffect(() => {
        if (blocked) playerRef.current?.pauseVideo();
    }, [blocked]);

    function togglePlay() {
        if (isPlaying) playerRef.current?.pauseVideo();
        else playerRef.current?.playVideo();
    }

    function skip(deltaSeconds: number) {
        const p = playerRef.current;
        if (!p) return;
        const next = Math.max(0, Math.min(duration, p.getCurrentTime() + deltaSeconds));
        p.seekTo(next, true);
        setCurrentTimeSec(next);
    }

    function commitSeek(value: number) {
        playerRef.current?.seekTo(value, true);
        setCurrentTimeSec(value);
        setIsDragging(false);
    }

    function toggleMute() {
        const p = playerRef.current;
        if (!p) return;
        if (isMuted || p.isMuted()) {
            p.unMute();
            setIsMuted(false);
            if (volume === 0) {
                p.setVolume(100);
                setVolume(100);
            }
        } else {
            p.mute();
            setIsMuted(true);
        }
    }

    function setVolumeLevel(v: number) {
        const p = playerRef.current;
        if (!p) return;
        p.setVolume(v);
        setVolume(v);
        if (v === 0) {
            p.mute();
            setIsMuted(true);
        } else if (isMuted) {
            p.unMute();
            setIsMuted(false);
        }
    }

    const shownTime = isDragging ? dragValue : currentTimeSec;

    return (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            {embed.kind === 'youtube' && ytError ? (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white/70">
                    This video couldn&apos;t be loaded. Please refresh, or contact support if it keeps happening.
                </div>
            ) : embed.kind === 'youtube' ? (
                <>
                    {/* YouTube renders inside a closed shadow root — never directly clickable or
                        inspectable; only the controls below can drive playback. */}
                    <div ref={shadowHostRef} className="pointer-events-none absolute inset-0 overflow-hidden" />

                    <button
                        type="button"
                        onClick={togglePlay}
                        disabled={!isReady}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                        className="absolute inset-0 z-10 cursor-pointer disabled:cursor-default"
                    />
                    {!isPlaying && isReady && (
                        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-5xl text-white/90 drop-shadow-lg">
                            ▶
                        </span>
                    )}

                    <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2 pt-8">
                        <input
                            type="range"
                            min={0}
                            max={duration || 0}
                            step={0.1}
                            value={shownTime}
                            disabled={!isReady}
                            onChange={(e) => {
                                setIsDragging(true);
                                setDragValue(Number(e.target.value));
                            }}
                            onMouseUp={(e) => commitSeek(Number(e.currentTarget.value))}
                            onTouchEnd={(e) => commitSeek(Number(e.currentTarget.value))}
                            onKeyUp={(e) => commitSeek(Number(e.currentTarget.value))}
                            aria-label="Seek"
                            className="h-1.5 w-full cursor-pointer accent-primary disabled:cursor-default"
                        />
                        <div className="mt-1.5 flex items-center gap-1.5 text-white">
                            <button type="button" onClick={() => skip(-10)} disabled={!isReady} aria-label="Rewind 10 seconds" className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40">
                                ⏪
                            </button>
                            <button type="button" onClick={togglePlay} disabled={!isReady} aria-label={isPlaying ? 'Pause' : 'Play'} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40">
                                {isPlaying ? '⏸' : '▶'}
                            </button>
                            <button type="button" onClick={() => skip(10)} disabled={!isReady} aria-label="Forward 10 seconds" className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40">
                                ⏩
                            </button>
                            <span className="ml-1 whitespace-nowrap font-mono text-xs tabular-nums text-white/80">
                                {formatTime(shownTime)} / {formatTime(duration)}
                            </span>
                            <span className="flex-1" />
                            <button type="button" onClick={toggleMute} disabled={!isReady} aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40">
                                {isMuted || volume === 0 ? '🔇' : '🔊'}
                            </button>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={isMuted ? 0 : volume}
                                disabled={!isReady}
                                onChange={(e) => setVolumeLevel(Number(e.target.value))}
                                aria-label="Volume"
                                className="h-1.5 w-16 cursor-pointer accent-primary disabled:cursor-default"
                            />
                        </div>
                    </div>
                </>
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
