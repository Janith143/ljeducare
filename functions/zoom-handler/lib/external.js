/**
 * zoomExternalJoin — per-buyer Zoom join link for an EXTERNAL-marketplace entitlement.
 *
 * The partner hub (clazz.lk) sold this class white-label; the buyer is NOT a user here.
 * Authorization = the externalEntitlements/{token} record written by /api/connector/enroll
 * plus an HMAC signature (PORTAL_BRIDGE_SECRET — same scheme as the web connector:
 * sha256(`${ts}.${rawBody}`), headers x-portal-timestamp / x-portal-signature, 5-min skew).
 * Mints the same unique approved registrant as joinZoomClass, keyed by a pseudonymous
 * buyerRef (synthetic email — no PII crosses), cached in zoom_sessions like native joins.
 */
const crypto = require('node:crypto');
const { onRequest } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { apiCall } = require('./client');

const MAX_SKEW_MS = 5 * 60 * 1000;

function verifySignature(rawBody, timestamp, signature) {
    const key = process.env.PORTAL_BRIDGE_SECRET || '';
    if (!key || !timestamp || !signature) return false;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) return false;
    const expected = crypto.createHmac('sha256', key).update(`${timestamp}.${rawBody}`).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const zoomExternalJoin = onRequest(
    { secrets: ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET', 'PORTAL_BRIDGE_SECRET'], cors: false },
    async (req, res) => {
        if (req.method !== 'POST') return res.status(405).json({ ok: false });
        const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
        if (!verifySignature(raw, req.get('x-portal-timestamp'), req.get('x-portal-signature'))) {
            return res.status(401).json({ ok: false, error: 'unauthorized' });
        }

        let body;
        try { body = JSON.parse(raw); } catch { return res.status(400).json({ ok: false, error: 'bad_request' }); }
        const entitlementToken = String(body.entitlementToken || '');
        const classId = String(body.classId || '');
        if (!entitlementToken || !classId) return res.status(400).json({ ok: false, error: 'missing' });

        const db = getFirestore();
        const entSnap = await db.collection('externalEntitlements').doc(entitlementToken).get();
        const ent = entSnap.data();
        if (!ent || ent.revoked || ent.itemType !== 'class' || String(ent.providerItemId) !== classId) {
            return res.status(200).json({ ok: false, reason: 'not_entitled' });
        }
        const buyerRef = String(ent.buyerRef || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
        if (!buyerRef) return res.status(200).json({ ok: false, reason: 'not_entitled' });

        const classDoc = await db.doc(`classes/${classId}`).get();
        const cls = classDoc.data();
        if (!cls || cls.isDeleted) return res.status(200).json({ ok: false, reason: 'not_found' });
        if (cls.meetProvider !== 'zoom' || !cls.zoomMeetingId) {
            return res.status(200).json({ ok: false, reason: 'no_meeting' });
        }

        const staffId = cls.teacherId;
        const meetingId = String(cls.zoomMeetingId);
        // Pseudonymous registrant — non-routable partner address, no PII. Same email on
        // re-join → Zoom returns the SAME registrant/join_url (and we cache it anyway).
        const registrantEmail = `mkt-${buyerRef}@partner.clazz.lk`;
        const extStudentKey = `ext:${buyerRef}`;

        // Reuse a cached join_url (mirrors joinZoomClass — avoids Zoom's 3-adds/day limit).
        const priorSnap = await db
            .collection('zoom_sessions')
            .where('studentId', '==', extStudentKey)
            .where('classId', '==', classId)
            .get();
        const cached = priorSnap.docs.map((d) => d.data()).find((s) => String(s.meetingId) === meetingId && s.joinUrl);

        let joinUrl = cached?.joinUrl;
        if (!joinUrl) {
            const reg = await apiCall(staffId, 'POST', `/meetings/${meetingId}/registrants`, {
                email: registrantEmail,
                first_name: 'Clazz',
                last_name: 'Student',
            });
            joinUrl = reg.join_url;
            try {
                await apiCall(staffId, 'PUT', `/meetings/${meetingId}/registrants/status`, {
                    action: 'approve',
                    registrants: [{ email: registrantEmail }],
                });
            } catch { /* approval best-effort — auto-approve meetings still return a usable link */ }
            if (!joinUrl) {
                const list = await apiCall(staffId, 'GET', `/meetings/${meetingId}/registrants?status=approved&page_size=300`);
                joinUrl = (list.registrants || []).find((r) => r.email === registrantEmail)?.join_url;
            }
        }
        if (!joinUrl) return res.status(200).json({ ok: false, reason: 'mint_failed' });

        const sessionRef = db.collection('zoom_sessions').doc();
        await sessionRef.set({
            id: sessionRef.id,
            studentId: extStudentKey,
            classId,
            meetingId,
            joinUrl,
            deviceHash: null,
            external: true,
            status: 'active',
            createdAt: new Date().toISOString(),
            lastJoinedAt: FieldValue.serverTimestamp(),
        });

        return res.status(200).json({ ok: true, joinUrl });
    },
);

module.exports = { zoomExternalJoin };
