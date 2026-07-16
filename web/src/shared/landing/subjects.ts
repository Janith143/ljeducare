import type { LandingSubject } from '../types/landing';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Does a subject card belong under a filter chip?
 *
 * Explicit `tags` win. Otherwise we fall back to matching the chip as a WHOLE WORD
 * in the card's text — a plain substring test is wrong here: the chip "IT" appears
 * inside "Digital", so "Digital Marketing" would show up under the IT filter.
 */
export function subjectMatchesChip(subject: LandingSubject, chip: string): boolean {
    const needle = chip.trim().toLowerCase();
    if (!needle) return true;

    const tags = (subject.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (tags.length > 0) return tags.includes(needle);

    const hay = `${subject.title ?? ''} ${subject.description ?? ''}`.toLowerCase();
    return new RegExp(`\\b${escapeRegExp(needle)}\\b`).test(hay);
}

/** The cards to show for the chip at `activeIndex` (index 0 is the catch-all "All"). */
export function filterSubjects(items: LandingSubject[], chips: string[], activeIndex: number): LandingSubject[] {
    if (activeIndex <= 0) return items;
    const chip = chips[activeIndex];
    if (!chip) return items;
    return items.filter((s) => subjectMatchesChip(s, chip));
}
