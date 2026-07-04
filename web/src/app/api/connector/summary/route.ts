import { NextResponse } from 'next/server';
import { PORTAL_SIG_HEADER, PORTAL_TS_HEADER, verifySignature } from '@/lib/connector/auth';
import { resolveLinkToken } from '@/lib/connector/tokens';
import { buildStudentSummary } from '@/lib/connector/summary';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * Connector /summary — the hub exchanges a stored linkToken for this student's
 * normalized LJ Educare content (enrollments, courses, certificates + deep-links).
 * Returns only the linked student's own data; never requires the password again.
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

    const link = await resolveLinkToken(String(body.linkToken ?? ''));
    if (!link) {
        return NextResponse.json({ ok: false, reason: 'invalid_link' }, { status: 200 });
    }

    const summary = await buildStudentSummary(link.uid);
    if (!summary) {
        return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 200 });
    }

    return NextResponse.json({ ok: true, provider: { name: SITE.name }, ...summary }, { status: 200 });
}
