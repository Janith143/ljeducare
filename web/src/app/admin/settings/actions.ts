'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import type { ChannelFlags, NotificationSettings } from '@ljeducare/shared';
import { COLLECTIONS, SETTINGS_DOCS, STORAGE_PATHS } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { adminDb, adminStorage } from '@/lib/firebase/admin';

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
    /** Bank/payment QR shown next to the account details on the slip-payment page. */
    qrImageUrl?: string;
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
                    // '' explicitly clears a removed QR; undefined would leave the old one.
                    qrImageUrl: (input.qrImageUrl ?? '').trim().slice(0, 500),
                },
            },
            { merge: true },
        );
    revalidatePath('/admin/settings');
    return { ok: true };
}

/**
 * Upload the bank/payment QR via the SERVER (Admin SDK), authed by the session cookie —
 * same pattern as the landing/category image uploads. Stored under site-assets, which
 * is publicly readable so students can see it on the slip page.
 */
export async function uploadBankQrAction(formData: FormData): Promise<{ url?: string; error?: string }> {
    await requirePermission('settings');
    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'No file provided.' };
    if (!file.type.startsWith('image/')) return { error: 'Please choose an image file.' };
    if (file.size > 5 * 1024 * 1024) return { error: 'Image must be under 5 MB.' };

    try {
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) return { error: 'Storage is not configured.' };
        const token = randomUUID();
        const path = `${STORAGE_PATHS.SITE_ASSETS}/payment-qr-${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await adminStorage()
            .bucket(bucketName)
            .file(path)
            .save(buffer, {
                metadata: { contentType: file.type, metadata: { firebaseStorageDownloadTokens: token } },
            });
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
        return { url };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
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
