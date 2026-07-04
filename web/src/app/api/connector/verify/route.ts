import { NextResponse } from 'next/server';
import { COLLECTIONS } from '@ljeducare/shared';
import { PORTAL_SIG_HEADER, PORTAL_TS_HEADER, verifySignature } from '@/lib/connector/auth';
import { verifyPassword } from '@/lib/connector/verifyPassword';
import { mintLinkToken } from '@/lib/connector/tokens';
import { checkRateLimit } from '@/lib/connector/ratelimit';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * Connector /verify — the hub proves a student owns this LJ Educare account.
 * Resolves the student by their studentId (the authority), verifies the password
 * against that account's email, and returns a revocable linkToken on success.
 * A bad shared-secret signature → 401; wrong/missing credentials → 200 { ok:false }.
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

    const studentId = String(body.studentId ?? '').trim().toUpperCase();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (!studentId || !password) {
        return NextResponse.json({ ok: false, reason: 'missing' }, { status: 200 });
    }

    if (!(await checkRateLimit(`verify_${studentId}`))) {
        return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
    }

    const q = await adminDb()
        .collection(COLLECTIONS.USERS)
        .where('studentId', '==', studentId)
        .limit(1)
        .get();
    if (q.empty) {
        return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 200 });
    }

    const doc = q.docs[0];
    const user = doc.data();
    if (user.role !== 'student') {
        return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 200 });
    }
    const uid = String(user.uid ?? doc.id);
    const accountEmail = String(user.email ?? '').toLowerCase();

    // studentId is the authority — verify the password against the account's own email.
    const verifiedUid = await verifyPassword(accountEmail || email, password);
    if (!verifiedUid || verifiedUid !== uid) {
        return NextResponse.json({ ok: false, reason: 'invalid_credentials' }, { status: 200 });
    }

    const name = `${String(user.firstName ?? '')} ${String(user.lastName ?? '')}`.trim() || accountEmail;
    const linkToken = await mintLinkToken(uid, studentId);
    return NextResponse.json({ ok: true, providerStudentId: studentId, name, linkToken }, { status: 200 });
}
