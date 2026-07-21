import { NextResponse } from 'next/server';
import { PORTAL_SIG_HEADER, PORTAL_TS_HEADER, verifySignature } from '@/lib/connector/auth';
import { mintEntitlement } from '@/lib/connector/entitlements';

export const dynamic = 'force-dynamic';

/**
 * Connector /enroll — a partner hub registers a marketplace PURCHASE of one of our items.
 * Records a pseudonymous entitlement (no user created, no enrollment array touched) and
 * returns a revocable `entitlementToken` the hub presents to /content for delivery handles.
 * Bad shared-secret signature → 401; missing fields → 200 { ok:false }.
 */
export async function POST(request: Request) {
    const raw = await request.text();
    if (!await verifySignature(raw, request.headers.get(PORTAL_TS_HEADER), request.headers.get(PORTAL_SIG_HEADER))) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }

    const buyerRef = String(body.buyerRef ?? '').trim();
    const itemType = body.itemType === 'course' ? 'course' : body.itemType === 'class' ? 'class' : null;
    const itemId = String(body.itemId ?? '').trim();
    if (!buyerRef || !itemType || !itemId) {
        return NextResponse.json({ ok: false, reason: 'missing' }, { status: 200 });
    }

    const entitlementToken = await mintEntitlement(buyerRef, itemId, itemType);
    return NextResponse.json({ ok: true, entitlementToken }, { status: 200 });
}
