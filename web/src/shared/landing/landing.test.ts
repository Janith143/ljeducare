import { describe, expect, it } from 'vitest';
import { DEFAULT_LANDING } from './defaults';
import { eventDateParts, visibleEvents } from './helpers';
import { mergeLandingSettings } from './merge';
import { filterSubjects, subjectMatchesChip } from './subjects';
import type { LandingSubject } from '../types/landing';

const subject = (title: string, description = '', tags?: string[]): LandingSubject => ({
    icon: 'ph-atom',
    title,
    description,
    ...(tags ? { tags } : {}),
});

describe('mergeLandingSettings', () => {
    it('returns the shipped defaults when nothing is stored', () => {
        expect(mergeLandingSettings(undefined).hero?.titlePrefix).toBe(DEFAULT_LANDING.hero?.titlePrefix);
    });

    it('lets a stored value win while backfilling untouched fields', () => {
        const merged = mergeLandingSettings({ hero: { badge: 'Custom badge' } });
        expect(merged.hero?.badge).toBe('Custom badge');
        expect(merged.hero?.titlePrefix).toBe(DEFAULT_LANDING.hero?.titlePrefix);
    });

    it('keeps an explicitly cleared field cleared instead of snapping back to the default', () => {
        expect(mergeLandingSettings({ hero: { badge: '' } }).hero?.badge).toBe('');
        expect(mergeLandingSettings({ hero: { enabled: false } }).hero?.enabled).toBe(false);
    });

    it('replaces arrays wholesale so deleted items stay deleted', () => {
        const merged = mergeLandingSettings({ faq: { items: [] } });
        expect(merged.faq?.items).toEqual([]);
    });
});

describe('subjectMatchesChip', () => {
    it('matches on explicit tags, case-insensitively', () => {
        const s = subject('Information Technology', 'Programming, AI', ['IT']);
        expect(subjectMatchesChip(s, 'IT')).toBe(true);
        expect(subjectMatchesChip(s, 'it')).toBe(true);
        expect(subjectMatchesChip(s, 'Science')).toBe(false);
    });

    it('does not let a chip match a word it merely sits inside', () => {
        // Regression: a substring test matched "IT" inside "Digital Marketing".
        const s = subject('Digital Marketing', 'SEO, Social Media');
        expect(subjectMatchesChip(s, 'IT')).toBe(false);
        expect(subjectMatchesChip(s, 'Digital Marketing')).toBe(true);
    });

    it('falls back to whole-word text matching when a card has no tags', () => {
        const s = subject('Science & Math', 'Physics, Chemistry');
        expect(subjectMatchesChip(s, 'Science')).toBe(true);
        expect(subjectMatchesChip(s, 'Physics')).toBe(true);
        expect(subjectMatchesChip(s, 'Business')).toBe(false);
    });

    it('treats a tagged card as tags-only', () => {
        const s = subject('Science & Math', 'Physics', ['Science']);
        expect(subjectMatchesChip(s, 'Physics')).toBe(false);
    });

    it('does not blow up on regex metacharacters in a chip', () => {
        expect(() => subjectMatchesChip(subject('C++ (advanced)'), 'C++ (advanced)')).not.toThrow();
    });
});

describe('filterSubjects', () => {
    const chips = ['All', 'Science', 'IT'];
    const items = [
        subject('Science & Math', 'Physics', ['Science']),
        subject('Information Technology', 'Programming', ['IT']),
        subject('Digital Marketing', 'SEO'),
    ];

    it('shows everything under the first chip', () => {
        expect(filterSubjects(items, chips, 0)).toHaveLength(3);
    });

    it('filters to the tagged cards', () => {
        expect(filterSubjects(items, chips, 2).map((s) => s.title)).toEqual(['Information Technology']);
    });

    it('every shipped chip resolves to at least one shipped card', () => {
        const shipped = DEFAULT_LANDING.subjects!;
        shipped.chips!.forEach((_, i) => {
            expect(filterSubjects(shipped.items!, shipped.chips!, i).length).toBeGreaterThan(0);
        });
    });
});

describe('events', () => {
    it('splits an ISO date without drifting across timezones', () => {
        expect(eventDateParts('2026-08-15')).toEqual({ month: 'Aug', day: '15' });
    });

    it('hides past events and sorts the rest soonest-first', () => {
        const section = {
            hidePastEvents: true,
            items: [
                { id: 'c', date: '2026-09-05', title: 'Later' },
                { id: 'a', date: '2026-01-01', title: 'Past' },
                { id: 'b', date: '2026-08-15', title: 'Soon' },
            ],
        };
        expect(visibleEvents(section, '2026-07-16').map((e) => e.title)).toEqual(['Soon', 'Later']);
    });

    it('keeps past events when the admin turns auto-hiding off', () => {
        const section = { hidePastEvents: false, items: [{ id: 'a', date: '2020-01-01', title: 'Past' }] };
        expect(visibleEvents(section, '2026-07-16')).toHaveLength(1);
    });

    it('skips events switched off', () => {
        const section = { items: [{ id: 'a', date: '2026-08-15', title: 'Hidden', enabled: false }] };
        expect(visibleEvents(section, '2026-07-16')).toHaveLength(0);
    });
});
