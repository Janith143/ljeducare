'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { ChannelFlags, NotificationSettings } from '@ljeducare/shared';
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

/**
 * Save settings/notifications — which channels each automatic message may use.
 * Values are written explicitly (never partially) so delivery reads one complete doc.
 */
export async function saveNotificationSettingsAction(
    input: NotificationSettings,
): Promise<{ ok?: boolean; error?: string }> {
    const user = await requirePermission('settings');
    const flags = (f: ChannelFlags | undefined) => ({
        inApp: !!f?.inApp,
        email: !!f?.email,
        sms: !!f?.sms,
    });
    try {
        await adminDb()
            .doc(`${COLLECTIONS.SETTINGS}/${SETTINGS_DOCS.NOTIFICATIONS}`)
            .set(
                {
                    guardianAttendance: flags(input.guardianAttendance),
                    payment: flags(input.payment),
                    teacherMessage: flags(input.teacherMessage),
                    classReminder: {
                        ...flags(input.classReminder),
                        enabled: input.classReminder?.enabled !== false,
                        // Clamp: a negative or absurd lead would silently never fire.
                        leadMinutes: Math.min(720, Math.max(0, Number(input.classReminder?.leadMinutes ?? 30) || 0)),
                        alsoAtStart: input.classReminder?.alsoAtStart !== false,
                    },
                    updatedAt: new Date().toISOString(),
                    updatedBy: user.email ?? user.uid,
                },
                { merge: true },
            );
        revalidatePath('/admin/settings');
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}
