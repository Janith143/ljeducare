import { NextResponse } from 'next/server';
import { PORTAL_SIG_HEADER, PORTAL_TS_HEADER, verifySignature } from '@/lib/connector/auth';
import { revokeLinkToken } from '@/lib/connector/tokens';

export const dynamic = 'force-dynamic';

/**
 * Connector /revoke — the hub invalidates a linkToken when the student unlinks.
 * Idempotent; always 200 for a valid signature.
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

    await revokeLinkToken(String(body.linkToken ?? ''));
    return NextResponse.json({ ok: true }, { status: 200 });
}
