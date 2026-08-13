/**
 * Resolve a stored video URL to an embeddable form (ported videoSource essentials).
 * `src` is the bare embed URL with no query string — the caller owns player params,
 * since baking any in here just invites duplicate `?a=1&a=1` params downstream.
 */
export function toEmbed(url: string): { kind: 'youtube' | 'video' | 'external'; src: string } {
    const yt = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{11})/,
    );
    if (yt) {
        return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
    }
    if (/\.(mp4|webm|m3u8)(\?|$)/i.test(url)) return { kind: 'video', src: url };
    return { kind: 'external', src: url };
}
