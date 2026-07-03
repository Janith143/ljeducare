/**
 * zoomWebhook — Zoom "recording.completed" → saves cloud recordings onto the
 * owning class doc (recordingUrls[date]). Also answers Zoom's endpoint URL
 * validation challenge. Verifies the Zoom signature when ZOOM_WEBHOOK_SECRET set.
 */
const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');

const TRUSTED_HOSTS = ['zoom.us', 'zoom.com'];
const stripQuery = (u) => String(u || '').split('?')[0];

function verifySignature(req) {
    const secret = process.env.ZOOM_WEBHOOK_SECRET;
    if (!secret) return true; // not configured → skip (best-effort)
    const ts = req.headers['x-zm-request-timestamp'];
    const msg = `v0:${ts}:${JSON.stringify(req.body)}`;
    const hash = crypto.createHmac('sha256', secret).update(msg).digest('hex');
    return `v0=${hash}` === req.headers['x-zm-signature'];
}

const zoomWebhook = onRequest({ secrets: ['ZOOM_WEBHOOK_SECRET'], cors: false }, async (req, res) => {
    const body = req.body || {};

    // Endpoint URL validation handshake.
    if (body.event === 'endpoint.url_validation') {
        const secret = process.env.ZOOM_WEBHOOK_SECRET || '';
        const encrypted = crypto.createHmac('sha256', secret).update(body.payload.plainToken).digest('hex');
        return res.status(200).json({ plainToken: body.payload.plainToken, encryptedToken: encrypted });
    }
    if (!verifySignature(req)) return res.status(401).send('bad signature');
    if (body.event !== 'recording.completed') return res.status(200).send('ignored');

    try {
        const obj = body.payload?.object || {};
        const meetingId = String(obj.id);
        const date = String(obj.start_time || '').split('T')[0] || new Date().toISOString().slice(0, 10);
        const files = (obj.recording_files || []).filter(
            (f) =>
                f.file_type === 'MP4' &&
                ['shared_screen_with_speaker_view', 'shared_screen_with_gallery_view', 'speaker_view', 'gallery_view'].includes(f.recording_type),
        );
        const urls = files
            .filter((f) => {
                try {
                    const host = new URL(f.download_url).hostname.toLowerCase();
                    return TRUSTED_HOSTS.some((t) => host === t || host.endsWith(`.${t}`));
                } catch {
                    return false;
                }
            })
            .map((f) => (obj.download_token ? `${f.download_url}?access_token=${obj.download_token}` : f.download_url));
        if (!urls.length) return res.status(200).send('no video files');

        const db = getFirestore();
        const snap = await db.collection('classes').where('zoomMeetingId', '==', meetingId).limit(1).get();
        if (snap.empty) {
            logger.warn(`zoomWebhook: no class for meeting ${meetingId}`);
            return res.status(200).send('no class');
        }
        const doc = snap.docs[0];
        const existing = doc.data().recordingUrls?.[date] || [];
        const seen = new Set(existing.map(stripQuery));
        const merged = [...existing, ...urls.filter((u) => !seen.has(stripQuery(u)))];
        await doc.ref.set({ recordingUrls: { ...(doc.data().recordingUrls || {}), [date]: merged } }, { merge: true });
        logger.log(`zoomWebhook: saved ${merged.length - existing.length} recording(s) for class ${doc.id}`);
        return res.status(200).send('ok');
    } catch (e) {
        logger.error('zoomWebhook failed', e?.message);
        return res.status(200).send('error-logged'); // 200 so Zoom doesn't retry-storm
    }
});

module.exports = { zoomWebhook };
