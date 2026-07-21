import { NextResponse } from 'next/server';
import { PORTAL_SIG_HEADER, PORTAL_TS_HEADER, verifySignature } from '@/lib/connector/auth';
import { buildPublicCatalog } from '@/lib/connector/catalog';

export const dynamic = 'force-dynamic';

/**
 * Connector /catalog — returns ALL published classes/courses (+ thin teacher profiles and
 * categories) for a marketplace hub (clazz.lk) to list and sell white-label. Public catalog
 * data only: no student, no linkToken, no rate-limit — just the same shared-secret HMAC gate
 * as the rest of the connector. The paid content itself (video URLs, join links) is NOT here;
 * it's fetched per-purchase via /content. Sign over the raw request body (may be empty).
 */
export async function POST(request: Request) {
    const raw = await request.text();
    if (!await verifySignature(raw, request.headers.get(PORTAL_TS_HEADER), request.headers.get(PORTAL_SIG_HEADER))) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const catalog = await buildPublicCatalog();
    return NextResponse.json({ ok: true, ...catalog }, { status: 200 });
}
