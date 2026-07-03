import 'server-only';

import { unstable_cache } from 'next/cache';
import type { CurrencySettings } from '@ljeducare/shared';
import { COLLECTIONS, SETTINGS_DOCS } from '@ljeducare/shared';
import { adminDb } from '@/lib/firebase/admin';

const FALLBACK: CurrencySettings = { base: 'LKR', enabled: ['LKR'], rates: {} };

/** settings/currencies — cached 5 min; revalidated on admin save via tag. */
export const getCurrencySettings = unstable_cache(
    async (): Promise<CurrencySettings> => {
        const doc = await adminDb()
            .doc(`${COLLECTIONS.SETTINGS}/${SETTINGS_DOCS.CURRENCIES}`)
            .get();
        if (!doc.exists) return FALLBACK;
        const data = doc.data() as CurrencySettings;
        return {
            base: data.base ?? 'LKR',
            enabled: Array.isArray(data.enabled) && data.enabled.length ? data.enabled : ['LKR'],
            rates: data.rates ?? {},
        };
    },
    ['currency-settings'],
    { revalidate: 300, tags: ['currencies'] },
);
