'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { COLLECTIONS, SETTINGS_DOCS } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export interface CurrencySettingsInput {
    enabled: string[];
    rates: Record<string, number>; // 1 LKR = rate units of currency
}

const CODE = /^[A-Z]{3}$/;

/** Save settings/currencies — base stays LKR; rates are base-relative. */
export async function saveCurrencySettingsAction(input: CurrencySettingsInput) {
    const admin = await requirePermission('settings');

    const enabled = [...new Set(['LKR', ...input.enabled.map((c) => c.toUpperCase().trim())])].filter((c) =>
        CODE.test(c),
    );
    const rates: Record<string, { rate: number; updatedAt: string }> = {};
    const now = new Date().toISOString();
    for (const ccy of enabled) {
        if (ccy === 'LKR') continue;
        const rate = Number(input.rates[ccy]);
        if (!(rate > 0)) return { error: `Rate for ${ccy} must be a positive number (1 LKR = ? ${ccy}).` };
        rates[ccy] = { rate, updatedAt: now };
    }

    await adminDb().doc(`${COLLECTIONS.SETTINGS}/${SETTINGS_DOCS.CURRENCIES}`).set({
        base: 'LKR',
        enabled,
        rates,
        ratesUpdatedBy: admin.uid,
    });

    revalidateTag('currencies');
    revalidatePath('/admin/settings');
    return { ok: true };
}

export interface BankDetailsInput {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
    instructions: string;
}

/** Save institute bank details for the slip-payment flow (settings/gateways.bankDetails). */
export async function saveBankDetailsAction(
    input: BankDetailsInput,
): Promise<{ ok?: boolean; error?: string }> {
    await requirePermission('settings');
    await adminDb()
        .doc(`${COLLECTIONS.SETTINGS}/${SETTINGS_DOCS.GATEWAYS}`)
        .set(
            {
                bankDetails: {
                    bankName: input.bankName.trim().slice(0, 100),
                    accountName: input.accountName.trim().slice(0, 100),
                    accountNumber: input.accountNumber.trim().slice(0, 50),
                    branch: input.branch.trim().slice(0, 100),
                    instructions: input.instructions.trim().slice(0, 500),
                },
            },
            { merge: true },
        );
    revalidatePath('/admin/settings');
    return { ok: true };
}
