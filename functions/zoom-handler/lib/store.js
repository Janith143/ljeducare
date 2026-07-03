/**
 * Per-teacher Zoom credential storage + resolution.
 *
 * SECURITY: staff docs are publicly readable, so Zoom tokens/secrets live ONLY in
 * `staff/{id}/private/zoom` (Admin-SDK-only; rules deny all client access).
 *
 * Per-teacher Zoom Pro accounts: a teacher connects their OWN Zoom account via
 * OAuth. Optionally they register their own Zoom OAuth app (useCustomZoomApp +
 * customZoomClientId/Secret) so meetings are hosted on their own Pro plan and
 * counted against their own limits — otherwise the institute's shared app is used.
 */
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const privateRef = (staffId) => getFirestore().doc(`staff/${staffId}/private/zoom`);

async function getSecrets(staffId) {
    const snap = await privateRef(staffId).get();
    return snap.exists ? snap.data() : {};
}

async function writeTokens(staffId, tokens) {
    await privateRef(staffId).set(tokens, { merge: true });
}

async function clearSecrets(staffId) {
    try {
        await privateRef(staffId).delete();
    } catch {
        /* no private doc */
    }
    await getFirestore().doc(`staff/${staffId}`).set(
        {
            zoomAccountConnected: false,
            zoomEmail: FieldValue.delete(),
            zoomUserId: FieldValue.delete(),
            useCustomZoomApp: FieldValue.delete(),
            customZoomClientId: FieldValue.delete(),
        },
        { merge: true },
    );
}

/** Resolve the OAuth client id/secret to use for a staff member. */
async function getCredentials(staffId) {
    const platformId = process.env.ZOOM_CLIENT_ID;
    const platformSecret = process.env.ZOOM_CLIENT_SECRET;

    if (staffId) {
        const staff = (await getFirestore().doc(`staff/${staffId}`).get()).data() || {};
        const secrets = await getSecrets(staffId);
        if (staff.useCustomZoomApp && staff.customZoomClientId && secrets.customZoomClientSecret) {
            return { clientId: staff.customZoomClientId, clientSecret: secrets.customZoomClientSecret, custom: true };
        }
    }
    if (!platformId || !platformSecret) {
        throw new Error('Zoom is not configured. Set ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET secrets, or a teacher custom app.');
    }
    return { clientId: platformId, clientSecret: platformSecret, custom: false };
}

module.exports = { privateRef, getSecrets, writeTokens, clearSecrets, getCredentials };
