import 'server-only';

import type { LandingSettings } from '@ljeducare/shared';
import { COLLECTIONS, SETTINGS_DOCS, mergeLandingSettings } from '@ljeducare/shared';
import { adminDb } from '@/lib/firebase/admin';

export const LANDING_TAG = 'landing';

/**
 * The landing page config, defaults backfilled.
 *
 * Read FRESH on every render (no unstable_cache) for the same reason as
 * categories/homepage: App Hosting runs multiple instances, so per-instance ISR
 * caches diverge and admin edits would appear only on whichever instance handled
 * the revalidation. It's a single small doc, so a read per render is cheap.
 *
 * Falls back to the shipped defaults if Firestore is unreachable: `/` is the
 * institute's front door, and a marketing page that can render entirely from
 * constants should degrade to those rather than 500. Admin edits are the only
 * thing lost while the database is down.
 */
export async function getLandingSettings(): Promise<LandingSettings> {
    try {
        const doc = await adminDb().collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOCS.LANDING).get();
        return mergeLandingSettings(doc.data() as Partial<LandingSettings> | undefined);
    } catch (e) {
        console.error('[landing] falling back to defaults — settings/landing read failed:', e);
        return mergeLandingSettings(undefined);
    }
}
