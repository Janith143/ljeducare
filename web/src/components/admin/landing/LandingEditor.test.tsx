import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_LANDING } from '@ljeducare/shared';
import { FieldGrid } from './Fields';
import LandingEditor from './LandingEditor';
import { LANDING_SCHEMA } from './schema';

// The editor imports server actions (firebase-admin, next/headers) and the router,
// neither of which can load in a plain Node test — stub them at the module boundary.
vi.mock('@/app/admin/landing-page/actions', () => ({
    saveLandingSectionAction: vi.fn(),
    uploadLandingImageAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

/**
 * Smoke test: every section of the schema-driven CMS must render without throwing
 * and must actually emit inputs for its fields. Catches renderer regressions that
 * types alone can't (a field kind with no branch, a bad list default, …).
 */
/** React escapes text content, so compare against the escaped label ("Brand & Nav" -> "Brand &amp; Nav"). */
const escapeHtml = (s: string) =>
    s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

describe('LandingEditor', () => {
    it('renders the default section without crashing', () => {
        const html = renderToStaticMarkup(<LandingEditor settings={DEFAULT_LANDING} />);
        expect(html).toContain('Brand &amp; Nav');
        // Tab strip should offer every section.
        for (const s of LANDING_SCHEMA) expect(html).toContain(escapeHtml(s.label));
    });

    it('renders the brand tab pre-filled from the shipped defaults', () => {
        const html = renderToStaticMarkup(<LandingEditor settings={DEFAULT_LANDING} />);
        expect(html).toContain('value="LJ"');
        expect(html).toContain('value="Educare"');
        expect(html).toContain('Enroll Now');
        // Nav links are a repeatable list — its items must render too.
        expect(html).toContain('value="#about"');
    });

    it('renders an empty settings object without crashing', () => {
        // A brand-new install (or a section never saved) must not blow up the CMS.
        expect(() => renderToStaticMarkup(<LandingEditor settings={{}} />)).not.toThrow();
    });

    it('renders every section, and labels every field it exposes', () => {
        // The editor only mounts the active tab, so drive the field renderer per
        // section directly — this is what actually covers all 17 tabs.
        for (const section of LANDING_SCHEMA) {
            const data = (DEFAULT_LANDING as Record<string, unknown>)[section.key] as Record<string, unknown>;
            let html = '';
            expect(
                () => (html = renderToStaticMarkup(<FieldGrid fields={section.fields} value={data} onChange={() => {}} />)),
                `section "${section.key}" threw while rendering`,
            ).not.toThrow();
            for (const field of section.fields) {
                expect(html, `"${section.key}.${field.key}" rendered no label`).toContain(escapeHtml(field.label));
            }
        }
    });

    it('renders every section from an empty object without crashing', () => {
        for (const section of LANDING_SCHEMA) {
            expect(
                () => renderToStaticMarkup(<FieldGrid fields={section.fields} value={{}} onChange={() => {}} />),
                `section "${section.key}" threw on empty data`,
            ).not.toThrow();
        }
    });
});
