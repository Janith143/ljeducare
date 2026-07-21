import { NextResponse } from 'next/server';
import { PORTAL_SIG_HEADER, PORTAL_TS_HEADER, verifySignature } from '@/lib/connector/auth';
import { revokeEntitlement } from '@/lib/connector/entitlements';

export const dynamic = 'force-dynamic';

/**
 * Connector /revoke-entitlement — the hub refunded an external-marketplace sale; kill the
 * entitlement so /content (and the Zoom join mint) deny delivery from now on. Idempotent,
 * best-effort by design on the hub side.
 */
export async function POST(request: Request) {
    const raw = await request.text();
    if (!verifySignature(raw, request.headers.get(PORTAL_TS_HEADER), request.headers.get(PORTAL_SIG_HEADER))) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    let body: Record<string, unknown>;
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }
    await revokeEntitlement(String(body.entitlementToken ?? ''));
    return NextResponse.json({ ok: true }, { status: 200 });
}
