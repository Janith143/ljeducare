/** Resolve a stored video URL to an embeddable form (ported videoSource essentials). */
export function toEmbed(url: string): { kind: 'youtube' | 'video' | 'external'; src: string } {
    const yt = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{11})/,
    );
    if (yt) {
        return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1` };
    }
    if (/\.(mp4|webm|m3u8)(\?|$)/i.test(url)) return { kind: 'video', src: url };
    return { kind: 'external', src: url };
}
