/**
 * Login-event recording + token revocation.
 * Trimmed port of the source recordLoginEvent / bumpTokenVersion / forceLogoutUser
 * (suspicious-login detection + branded security emails deferred to phase 3).
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { audit, requireRole } = require('./util');

/** Client calls right after sign-in: register the session/device. */
const recordLoginEvent = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');

    const { deviceId, userAgent, app } = request.data || {};
    if (!deviceId) throw new HttpsError('invalid-argument', 'deviceId is required');

    await getFirestore().collection('loginEvents').add({
        uid,
        deviceId: String(deviceId).slice(0, 200),
        userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
        app: app || 'web',
        createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
});

/** Bump tokenVersion claim + revoke refresh tokens (self, or any user for main_admin). */
const bumpTokenVersion = onCall(async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new HttpsError('unauthenticated', 'Sign-in required');
    const targetUid = request.data?.uid || callerUid;

    if (targetUid !== callerUid && request.auth?.token?.role !== 'main_admin') {
        throw new HttpsError('permission-denied', 'main_admin required to target another user');
    }

    const user = await admin.auth().getUser(targetUid);
    const existing = user.customClaims || {};
    const nextVersion = (Number(existing.tokenVersion) || 0) + 1;
    await admin.auth().setCustomUserClaims(targetUid, { ...existing, tokenVersion: nextVersion });
    await admin.auth().revokeRefreshTokens(targetUid);
    await audit('token.bumped', { uid: targetUid, byUid: callerUid, tokenVersion: nextVersion });
    return { success: true, tokenVersion: nextVersion };
});

/** Admin force-logout: revoke tokens and flag the user doc so clients sign out. */
const forceLogoutUser = onCall(async (request) => {
    const byUid = requireRole(request, ['main_admin', 'manager']);
    const targetUid = String(request.data?.uid || '');
    if (!targetUid) throw new HttpsError('invalid-argument', 'uid required');

    await admin.auth().revokeRefreshTokens(targetUid);
    await getFirestore().doc(`users/${targetUid}`).set(
        { forceLogoutAt: new Date().toISOString() },
        { merge: true },
    );
    await audit('user.force_logout', { uid: targetUid, byUid });
    return { success: true };
});

module.exports = { recordLoginEvent, bumpTokenVersion, forceLogoutUser };
