/**
 * Zoom OAuth: connect (returns consent URL), callback (stores tokens),
 * disconnect, and custom-app (own Zoom Pro) registration.
 */
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');
const { completeOAuth, ZOOM_OAUTH } = require('./client');
const { clearSecrets, writeTokens, getCredentials } = require('./store');

const SECRETS = ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'];
const PROJECT = () => process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'ljeducare';
const APP_URL = () => process.env.PUBLIC_SITE_URL || 'https://ljeducare--ljeducare.asia-southeast1.hosted.app';
// The deployed zoomCallback URL — register this exact value in your Zoom app.
const REDIRECT_URI = () =>
    process.env.ZOOM_REDIRECT_URI || `https://asia-south1-${PROJECT()}.cloudfunctions.net/zoomCallback`;

/** Assert the caller may manage this staff member's Zoom connection. */
async function authorizeStaff(request, staffId) {
    const role = request.auth?.token?.role;
    if (!request.auth?.uid || !['teacher', 'teacher_admin', 'main_admin', 'manager'].includes(role)) {
        throw new HttpsError('permission-denied', 'Staff sign-in required');
    }
    if (role === 'teacher' && request.auth.token.tid !== staffId) {
        throw new HttpsError('permission-denied', 'You can only manage your own Zoom account');
    }
    const staff = await getFirestore().doc(`staff/${staffId}`).get();
    if (!staff.exists) throw new HttpsError('not-found', 'Staff member not found');
    return staff.data();
}

const zoomConnect = onCall({ secrets: SECRETS }, async (request) => {
    const staffId = String(request.data?.staffId || request.auth?.token?.tid || '');
    if (!staffId) throw new HttpsError('invalid-argument', 'staffId required');
    await authorizeStaff(request, staffId);
    if (!REDIRECT_URI()) throw new HttpsError('failed-precondition', 'ZOOM_REDIRECT_URI is not configured.');

    const { clientId } = await getCredentials(staffId);
    const nonce = crypto.randomBytes(16).toString('hex');
    await getFirestore().doc(`zoom_oauth_state/${nonce}`).set({
        staffId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    const url =
        `${ZOOM_OAUTH}/authorize?response_type=code` +
        `&client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI())}` +
        `&state=${nonce}`;
    return { url };
});

const zoomCallback = onRequest({ secrets: SECRETS, cors: false }, async (req, res) => {
    const { code, state } = req.query;
    const fail = (msg) => res.redirect(`${APP_URL()}/teacher/profile?zoom=error&msg=${encodeURIComponent(msg)}`);
    if (!code || !state) return fail('Missing code');

    const stateRef = getFirestore().doc(`zoom_oauth_state/${state}`);
    const stateDoc = await stateRef.get();
    if (!stateDoc.exists) return fail('Invalid or expired link');
    const { staffId, expiresAt } = stateDoc.data();
    await stateRef.delete();
    if (new Date(expiresAt) < new Date()) return fail('Link expired');

    try {
        await completeOAuth(staffId, String(code), REDIRECT_URI());
        return res.redirect(`${APP_URL()}/teacher/profile?zoom=connected`);
    } catch (e) {
        return fail(e.message || 'Zoom connection failed');
    }
});

const zoomDisconnect = onCall(async (request) => {
    const staffId = String(request.data?.staffId || request.auth?.token?.tid || '');
    await authorizeStaff(request, staffId);
    await clearSecrets(staffId);
    return { success: true };
});

/** Register the teacher's own Zoom OAuth app (their Pro account). */
const zoomSetCustomApp = onCall(async (request) => {
    const staffId = String(request.data?.staffId || request.auth?.token?.tid || '');
    await authorizeStaff(request, staffId);
    const { enabled, clientId, clientSecret } = request.data || {};

    const db = getFirestore();
    if (!enabled) {
        await db.doc(`staff/${staffId}`).set(
            { useCustomZoomApp: false, customZoomClientId: FieldValue.delete() },
            { merge: true },
        );
        await db.doc(`staff/${staffId}/private/zoom`).set({ customZoomClientSecret: FieldValue.delete() }, { merge: true });
        return { success: true };
    }
    if (!clientId || !clientSecret) throw new HttpsError('invalid-argument', 'Client ID and secret required');
    await db.doc(`staff/${staffId}`).set({ useCustomZoomApp: true, customZoomClientId: String(clientId) }, { merge: true });
    await writeTokens(staffId, { customZoomClientSecret: String(clientSecret) });
    return { success: true, note: 'Now click Connect to authorize your Zoom account.' };
});

module.exports = { zoomConnect, zoomCallback, zoomDisconnect, zoomSetCustomApp, authorizeStaff, SECRETS };
