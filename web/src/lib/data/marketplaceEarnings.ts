import 'server-only';
import { COLLECTIONS } from '@ljeducare/shared';
import { signPortalRequestWith, getConnectorKey } from '@/lib/connector/auth';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Our own income report, pulled FROM the clazz.lk marketplace hub.
 *
 * Every other connector call runs hub → us; this one runs us → hub. It is signed with the very
 * same pairing key the hub uses to call us, so there is nothing extra to configure beyond the
 * partner id. The hub scopes the response to whichever key validates, so we can only ever read
 * our own figures.
 *
 * Money terms, from our side of the deal:
 *   gross      — what the student paid on clazz.lk
 *   commission — clazz.lk's fee
 *   net        — what we earn
 */
const DEFAULT_HUB = 'https://asia-south1-clazz2-new.cloudfunctions.net/marketplaceDelivery';

export interface EarningsBucket {
    month?: string;
    teacherId?: string;
    itemId?: string;
    itemName?: string;
    itemType?: string;
    name?: string;
    gross: number;
    commission?: number;
    net: number;
    count: number;
}

export interface EarningsLine {
    saleId: string;
    itemId: string | null;
    itemName: string;
    itemType: string;
    teacherId: string | null;
    gross: number;
    commission: number;
    net: number;
    currency: string;
    saleDate: string | null;
    status: string;
}

export interface EarningsReport {
    providerId: string;
    currency: string;
    generatedAt: string;
    range: { from: string; to: string };
    commissionRate: number | null;
    summary: {
        gross: number; commission: number; net: number; salesCount: number;
        refundedGross: number; refundedCount: number; uniqueBuyers: number;
        total: number; pending: number; available: number; withdrawn: number;
    };
    timeseries: EarningsBucket[];
    byTeacher: EarningsBucket[];
    byItem: EarningsBucket[];
    topItems: EarningsBucket[];
    payouts: { amount: number; at: string | null; teachers: number }[];
    lineItems: EarningsLine[];
    truncated: boolean;
}

export type EarningsResult =
    | { ok: true; report: EarningsReport }
    | { ok: false; reason: 'not_configured' | 'no_provider_id' | 'unauthorized' | 'unreachable'; detail?: string };

export async function fetchMarketplaceEarnings(
    opts: { from?: string; to?: string } = {},
): Promise<EarningsResult> {
    let cfg: FirebaseFirestore.DocumentData | null = null;
    try {
        const snap = await adminDb().collection(COLLECTIONS.SETTINGS).doc('connector').get();
        cfg = snap.exists ? snap.data() ?? null : null;
    } catch {
        return { ok: false, reason: 'not_configured' };
    }
    if (!cfg || cfg.enabled === false || !cfg.hubKey) return { ok: false, reason: 'not_configured' };

    const providerId = String(cfg.providerId ?? '').trim().toUpperCase();
    if (!providerId) return { ok: false, reason: 'no_provider_id' };

    const hubUrl = String(cfg.hubUrl ?? '').trim().replace(/\/$/, '') || DEFAULT_HUB;
    const key = await getConnectorKey();
    if (!key) return { ok: false, reason: 'not_configured' };

    const raw = JSON.stringify({ providerId, ...(opts.from ? { from: opts.from } : {}), ...(opts.to ? { to: opts.to } : {}) });
    const ts = String(Date.now());

    try {
        const res = await fetch(`${hubUrl}/partner/earnings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-portal-timestamp': ts,
                'x-portal-signature': signPortalRequestWith(raw, ts, key),
            },
            body: raw,
            cache: 'no-store',
            signal: AbortSignal.timeout(20000),
        });
        if (res.status === 401) return { ok: false, reason: 'unauthorized' };
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
            return { ok: false, reason: 'unreachable', detail: `HTTP ${res.status}` };
        }
        return { ok: true, report: data as EarningsReport };
    } catch (e: unknown) {
        return { ok: false, reason: 'unreachable', detail: (e as Error).message };
    }
}
