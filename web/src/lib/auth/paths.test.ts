import { describe, expect, it } from 'vitest';
import { roleHomePath, safeNextPath } from './paths';

describe('safeNextPath', () => {
    it('keeps ordinary same-origin paths', () => {
        expect(safeNextPath('/admin')).toBe('/admin');
        expect(safeNextPath('/student/classes?tab=live')).toBe('/student/classes?tab=live');
    });

    it('ignores an absent or empty target', () => {
        expect(safeNextPath(null)).toBeNull();
        expect(safeNextPath(undefined)).toBeNull();
        expect(safeNextPath('')).toBeNull();
    });

    it('refuses to leave the site (open redirect)', () => {
        // These start with '/' but are protocol-relative — following them navigates off-site.
        expect(safeNextPath('//evil.com')).toBeNull();
        expect(safeNextPath('//evil.com/phish')).toBeNull();
        expect(safeNextPath('/\\evil.com')).toBeNull();
        expect(safeNextPath('https://evil.com')).toBeNull();
        expect(safeNextPath('http://evil.com')).toBeNull();
    });

    it('never sends a human to the kiosk scanner', () => {
        // Regression: an admin who once opened /kiosk kept being returned there by the
        // stale ?next=/kiosk their browser had cached.
        expect(safeNextPath('/kiosk')).toBeNull();
        expect(safeNextPath('/kiosk/scan')).toBeNull();
        expect(safeNextPath('/kiosk?x=1')).toBeNull();
    });

    it('does not over-match paths that merely start with the same letters', () => {
        expect(safeNextPath('/kiosk-pair')).toBe('/kiosk-pair');
    });
});

describe('roleHomePath', () => {
    it('routes each role to its own area', () => {
        expect(roleHomePath('main_admin')).toBe('/admin');
        expect(roleHomePath('manager')).toBe('/admin');
        expect(roleHomePath('teacher')).toBe('/teacher');
        expect(roleHomePath('teacher_admin')).toBe('/teacher');
        expect(roleHomePath('student')).toBe('/student');
        expect(roleHomePath('kiosk')).toBe('/kiosk');
        expect(roleHomePath(undefined)).toBe('/');
    });
});
