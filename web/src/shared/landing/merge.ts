import type { LandingSettings } from '../types/landing';
import { DEFAULT_LANDING } from './defaults';

type Plain = Record<string, unknown>;

const isPlainObject = (v: unknown): v is Plain =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Merge a stored settings doc over the defaults.
 *
 * - `undefined` (key absent) falls back to the default — new fields added to
 *   DEFAULT_LANDING light up automatically on docs saved before they existed.
 * - Any other value wins, including `''`, `false` and `[]` — clearing a field or
 *   deleting every item in a list must stick rather than snap back to the default.
 * - Arrays replace rather than merge element-wise; item lists are ordered and
 *   admin-owned, so index-wise merging would resurrect deleted entries.
 */
function deepMerge<T>(base: T, override: unknown): T {
    if (override === undefined) return base;
    if (!isPlainObject(base) || !isPlainObject(override)) return override as T;

    const out: Plain = { ...base };
    for (const [key, value] of Object.entries(override)) {
        out[key] = deepMerge((base as Plain)[key], value);
    }
    return out as T;
}

/** The landing page an admin has configured, backfilled with the shipped defaults. */
export function mergeLandingSettings(stored: Partial<LandingSettings> | undefined | null): LandingSettings {
    return deepMerge(DEFAULT_LANDING, stored ?? {});
}
