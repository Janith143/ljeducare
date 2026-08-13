'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FastForward, Maximize, Minimize, Pause, Play, Rewind, Volume2, VolumeX } from 'lucide-react';
import { toEmbed } from '@/lib/videoEmbed';
import Watermark from './Watermark';
import { useVideoSecurity } from './useVideoSecurity';
import { usePlayerFullscreen } from './usePlayerFullscreen';

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
    getIframe(): HTMLIFrameElement | null;
    destroy(): void;
}
declare global {
    interface Window {
        onYouTubeIframeAPIReady?: () => void;
        YT?: {
            Player: new (
                el: HTMLElement,
                opts: {
                    width?: number;
                    height?: number;
                    videoId?: string;
                    playerVars?: Record<string, string | number>;
                    events: { onReady: () => void; onStateChange: (e: { data: number }) => void; onError: (e: { data: number }) => void };
                },
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
 * IFrame Player API, not by YouTube's own (hidden) controls. The player is handed a
 * plain placeholder <div> and lets the API generate and manage its own iframe there —
 * adopting a hand-built iframe into the API instead (an earlier version of this file)
 * doesn't reliably work inside a closed shadow root; this is hybridLMS's exact,
 * proven-in-production pattern.
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

    const playerWrapperRef = useRef<HTMLDivElement>(null);
    const { isFakeFullscreen, isFullscreen, toggleFullscreen } = usePlayerFullscreen(playerWrapperRef);

    const shadowHostRef = useRef<HTMLDivElement>(null);
    const shadowRootRef = useRef<ShadowRoot | null>(null);
    const stageRef = useRef<HTMLDivElement | null>(null);
    const playerDivRef = useRef<HTMLDivElement | null>(null);
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

    // Set up the shadow-DOM stage (once) and (re)create the YT player for the current
    // video — re-runs whenever the video actually changes (e.g. switching lessons).
    useEffect(() => {
        if (embed.kind !== 'youtube' || !embed.videoId) return undefined;
        setYtError(false);
        setIsReady(false);
        setIsPlaying(false);
        setCurrentTimeSec(0);
        setDuration(0);

        const host = shadowHostRef.current;
        if (!host) return undefined;
        if (!shadowRootRef.current) {
            const root = host.attachShadow({ mode: 'closed' });
            shadowRootRef.current = root;
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
        }

        // A fresh placeholder for this video — YT.Player replaces it with its own iframe.
        playerDivRef.current?.remove();
        const placeholder = document.createElement('div');
        stageRef.current?.appendChild(placeholder);
        playerDivRef.current = placeholder;

        let cancelled = false;
        const createPlayer = () => {
            if (cancelled || !window.YT?.Player || !playerDivRef.current) return;
            playerRef.current?.destroy();
            playerRef.current = new window.YT.Player(playerDivRef.current, {
                width: HD_W,
                height: HD_H,
                videoId: embed.videoId,
                playerVars: {
                    controls: 0, // native controls hidden — the custom bar below drives playback
                    rel: 0,
                    modestbranding: 1,
                    disablekb: 1,
                    fs: 0, // YouTube's own fullscreen button stays off; ours targets the whole player
                    iv_load_policy: 3,
                    playsinline: 1,
                    origin: window.location.origin,
                },
                events: {
                    onReady: () => {
                        if (cancelled) return;
                        setIsReady(true);
                        setDuration(playerRef.current?.getDuration() ?? 0);
                        setIsMuted(!!playerRef.current?.isMuted());
                        // Re-tag the generated iframe so the fit/crop styles apply (the API
                        // doesn't preserve the placeholder's class on replacement).
                        try {
                            const ifr = playerRef.current?.getIframe();
                            if (ifr) {
                                ifr.classList.add('yt-frame');
                                ifr.setAttribute('width', String(HD_W));
                                ifr.setAttribute('height', String(HD_H));
                            }
                        } catch {
                            /* iframe not reachable */
                        }
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
            createPlayer();
        } else {
            const prev = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                prev?.();
                createPlayer();
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
    }, [embed.kind, embed.videoId, applyFit]);

    // Keep the fixed HD frame scaled to fit the visible card as it resizes (responsive
    // layout, orientation change, entering/leaving fullscreen).
    useEffect(() => {
        const host = shadowHostRef.current;
        if (!host || embed.kind !== 'youtube') return undefined;
        applyFit();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(applyFit) : null;
        ro?.observe(host);
        window.addEventListener('resize', applyFit);
        document.addEventListener('fullscreenchange', applyFit);
        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', applyFit);
            document.removeEventListener('fullscreenchange', applyFit);
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
        <div
            ref={playerWrapperRef}
            className="relative aspect-video w-full overflow-hidden rounded-xl bg-black"
            style={isFakeFullscreen ? { position: 'fixed', inset: 0, width: '100vw', height: '100dvh', maxWidth: 'none', zIndex: 2147483647, borderRadius: 0 } : undefined}
        >
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
                        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                            <Play className="h-16 w-16 text-white/90 drop-shadow-lg" fill="currentColor" />
                        </span>
                    )}

                    {isFakeFullscreen && (
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            aria-label="Exit fullscreen"
                            className="absolute top-3 right-3 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80"
                        >
                            <Minimize className="h-5 w-5" />
                        </button>
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
                        <div className="mt-1.5 flex items-center gap-1 text-white">
                            <button type="button" onClick={() => skip(-10)} disabled={!isReady} aria-label="Rewind 10 seconds" className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40">
                                <Rewind className="h-4 w-4" fill="currentColor" />
                            </button>
                            <button type="button" onClick={togglePlay} disabled={!isReady} aria-label={isPlaying ? 'Pause' : 'Play'} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40">
                                {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
                            </button>
                            <button type="button" onClick={() => skip(10)} disabled={!isReady} aria-label="Forward 10 seconds" className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40">
                                <FastForward className="h-4 w-4" fill="currentColor" />
                            </button>
                            <span className="ml-1 whitespace-nowrap font-mono text-xs tabular-nums text-white/80">
                                {formatTime(shownTime)} / {formatTime(duration)}
                            </span>
                            <span className="flex-1" />
                            <button type="button" onClick={toggleMute} disabled={!isReady} aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40">
                                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
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
                            <button
                                type="button"
                                onClick={toggleFullscreen}
                                disabled={!isReady}
                                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                                className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40"
                            >
                                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                            </button>
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
