import type { LandingEvent, LandingEvents, LandingFaqItem } from '../types/landing';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Split an ISO date into the event card's date box parts.
 * Parsed manually rather than via `new Date(iso)` so a YYYY-MM-DD string always
 * renders the date the admin typed, regardless of the server's timezone.
 */
export function eventDateParts(iso: string): { month: string; day: string } {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
    if (!m) return { month: '', day: '' };
    return { month: MONTHS[Number(m[2]) - 1] ?? '', day: m[3] };
}

/** `YYYY-MM-DD` for a Date, in local parts (matches how admins enter dates). */
export function toDateKey(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Events to actually render: enabled, optionally future-only, soonest first.
 * `todayKey` is injected so this stays pure and testable.
 */
export function visibleEvents(section: LandingEvents, todayKey: string): LandingEvent[] {
    const items = section.items ?? [];
    return items
        .filter((e) => e.enabled !== false)
        .filter((e) => (section.hidePastEvents === false ? true : (e.date ?? '') >= todayKey))
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

export function visibleFaqs(items: LandingFaqItem[] | undefined): LandingFaqItem[] {
    return (items ?? []).filter((f) => f.enabled !== false);
}

/** Stable-enough id for a new repeatable CMS item. */
export function newLandingItemId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
