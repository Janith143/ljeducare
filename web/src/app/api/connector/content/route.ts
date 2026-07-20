import { NextResponse } from 'next/server';
import { COLLECTIONS } from '@ljeducare/shared';
import { PORTAL_SIG_HEADER, PORTAL_TS_HEADER, verifySignature } from '@/lib/connector/auth';
import { resolveEntitlement } from '@/lib/connector/entitlements';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * Connector /content — the hub exchanges a stored entitlementToken for per-buyer delivery
 * handles it renders in ITS OWN white-label player. The buyer is never a user here; the
 * entitlement is the authorization. Recorded lessons are returned as video URLs (the hub
 * wraps them in its own anti-piracy player + watermark). The per-buyer LIVE Zoom join is
 * minted by the zoom-handler entitlement endpoint (wired in the next increment); this route
 * returns the schedule + join mode so the hub can render a "Join" affordance.
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

    const ent = await resolveEntitlement(String(body.entitlementToken ?? ''));
    if (!ent) return NextResponse.json({ ok: false, reason: 'invalid_entitlement' }, { status: 200 });
    const itemId = String(body.itemId ?? '').trim();
    if (itemId && itemId !== ent.providerItemId) {
        return NextResponse.json({ ok: false, reason: 'mismatch' }, { status: 200 });
    }

    if (ent.itemType === 'course') {
        const doc = await adminDb().collection(COLLECTIONS.COURSES).doc(ent.providerItemId).get();
        const c = doc.data();
        if (!c || c.isDeleted) return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 200 });
        const lessons = (c.lectures || []).map((l: Record<string, unknown>) => ({
            id: String(l.id ?? ''),
            title: String(l.title ?? ''),
            videoUrl: String(l.videoUrl ?? ''),
            durationMinutes: Number(l.durationMinutes ?? 0),
        }));
        return NextResponse.json({ ok: true, type: 'course', title: String(c.title ?? ''), lessons }, { status: 200 });
    }

    // Live class
    const doc = await adminDb().collection(COLLECTIONS.CLASSES).doc(ent.providerItemId).get();
    const c = doc.data();
    if (!c || c.isDeleted) return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 200 });
    const schedule = {
        date: String(c.date ?? ''),
        startTime: String(c.startTime ?? ''),
        endTime: String(c.endTime ?? ''),
        recurrence: String(c.recurrence ?? ''),
    };
    return NextResponse.json({
        ok: true,
        type: 'class',
        title: String(c.title ?? ''),
        schedule,
        joinMode: c.meetProvider === 'zoom' ? 'zoom_registrant' : 'none',
        joinUrl: null, // minted per-buyer by the zoom-handler entitlement endpoint (next increment)
    }, { status: 200 });
}
