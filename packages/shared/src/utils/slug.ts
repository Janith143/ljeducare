/** URL-safe slug from a title, with a short random suffix for uniqueness. */
export function slugify(title: string, withSuffix = true): string {
    const base = title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60);
    if (!withSuffix) return base;
    const suffix = Math.random().toString(36).slice(2, 6);
    return base ? `${base}-${suffix}` : suffix;
}
