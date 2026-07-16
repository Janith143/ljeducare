import { describe, expect, it } from 'vitest';
import { DEFAULT_LANDING } from '@ljeducare/shared';
import { LANDING_SCHEMA, type Field } from './schema';

/**
 * The CMS is schema-driven, so a field key that doesn't exist on the data would
 * render an empty input and then WRITE that emptiness back on save — silently
 * clearing content. These tests pin the schema to the real content model.
 */

type Obj = Record<string, unknown>;

const listFields = (fields: Field[]): Extract<Field, { kind: 'list' }>[] =>
    fields.filter((f): f is Extract<Field, { kind: 'list' }> => f.kind === 'list');

describe('LANDING_SCHEMA', () => {
    it('covers every editable section of the content model', () => {
        const schemaKeys = LANDING_SCHEMA.map((s) => s.key).sort();
        const modelKeys = Object.keys(DEFAULT_LANDING)
            .filter((k) => !['updatedAt', 'updatedBy'].includes(k))
            .sort();
        expect(schemaKeys).toEqual(modelKeys);
    });

    it('has no duplicate section keys or field keys', () => {
        const keys = LANDING_SCHEMA.map((s) => s.key);
        expect(new Set(keys).size).toBe(keys.length);

        for (const section of LANDING_SCHEMA) {
            const fieldKeys = section.fields.map((f) => f.key);
            expect(new Set(fieldKeys).size, `duplicate field in "${section.key}"`).toBe(fieldKeys.length);
        }
    });

    it('only exposes fields that exist on the shipped defaults', () => {
        for (const section of LANDING_SCHEMA) {
            const data = (DEFAULT_LANDING as Obj)[section.key] as Obj;
            expect(data, `no defaults for section "${section.key}"`).toBeTruthy();
            for (const field of section.fields) {
                expect(
                    Object.prototype.hasOwnProperty.call(data, field.key),
                    `schema field "${section.key}.${field.key}" is not in DEFAULT_LANDING`,
                ).toBe(true);
            }
        }
    });

    it('lines each list field up with the shape of its default items', () => {
        for (const section of LANDING_SCHEMA) {
            const data = (DEFAULT_LANDING as Obj)[section.key] as Obj;
            for (const list of listFields(section.fields)) {
                const items = data[list.key];
                expect(Array.isArray(items), `${section.key}.${list.key} should default to an array`).toBe(true);
                for (const item of items as Obj[]) {
                    for (const sub of list.fields) {
                        expect(
                            Object.prototype.hasOwnProperty.call(item, sub.key),
                            `default item in "${section.key}.${list.key}" is missing "${sub.key}"`,
                        ).toBe(true);
                    }
                }
            }
        }
    });

    it('creates new list items with every key the editor renders', () => {
        const checkList = (list: Extract<Field, { kind: 'list' }>, path: string) => {
            const made = list.makeItem();
            for (const sub of list.fields) {
                expect(
                    Object.prototype.hasOwnProperty.call(made, sub.key),
                    `makeItem() for "${path}" omits "${sub.key}" — the field would render blank`,
                ).toBe(true);
                if (sub.kind === 'list') checkList(sub, `${path}.${sub.key}`);
            }
        };
        for (const section of LANDING_SCHEMA) {
            for (const list of listFields(section.fields)) checkList(list, `${section.key}.${list.key}`);
        }
    });

    it('gives repeatable items that the page keys by id a generated id', () => {
        // events/faq render with key={item.id}; a missing id would break React reconciliation.
        for (const key of ['events', 'faq'] as const) {
            const section = LANDING_SCHEMA.find((s) => s.key === key)!;
            const list = listFields(section.fields).find((l) => l.key === 'items')!;
            expect(String(list.makeItem().id ?? ''), `${key} items need an id`).not.toBe('');
        }
    });

    it('declares defaultOn:false on opt-in flags so the editor never pre-ticks them', () => {
        // Regression: `featured` rendered pre-ticked for every faculty member (the
        // renderer treats an absent value as on), so saving promoted the wrong card.
        const walk = (fields: Field[], path: string) => {
            for (const f of fields) {
                if (f.kind === 'list') walk(f.fields, `${path}.${f.key}`);
                if (f.kind !== 'bool') continue;
                // A flag whose name reads as opt-in must not default to on.
                if (/^(featured)$/.test(f.key)) {
                    expect(f.defaultOn, `"${path}.${f.key}" must set defaultOn:false`).toBe(false);
                }
            }
        };
        for (const section of LANDING_SCHEMA) walk(section.fields, section.key);
    });

    it('marks the sections that have no enabled/title toggles in the design', () => {
        const noToggle = LANDING_SCHEMA.filter((s) => s.noToggle).map((s) => s.key);
        expect(noToggle.sort()).toEqual(['brand', 'footer', 'seo']);
    });
});
