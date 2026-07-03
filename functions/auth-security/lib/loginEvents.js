/**
 * Login-event recording + token revocation.
 * Trimmed port of the source recordLoginEvent / bumpTokenVersion / forceLogoutUser
 * (suspicious-login detection + branded security emails deferred to phase 3).
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { audit, requireRole } = require('./util');

// Max concurrent devices per user; when exceeded, the oldest session is kicked.
const MAX_DEVICES = Number(process.env.MAX_LOGIN_DEVICES) || 3;

/**
 * Client calls right after sign-in: register this device's session, log the
 * event, and enforce the device cap by deactivating the oldest sessions.
 * The client polls userSessions/{uid}_{deviceId}.active and signs out if kicked.
 */
const recordLoginEvent = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');

    const { deviceId, userAgent, app } = request.data || {};
    if (!deviceId) throw new HttpsError('invalid-argument', 'deviceId is required');
    const device = String(deviceId).slice(0, 200);

    const db = getFirestore();
    await db.collection('loginEvents').add({
        uid,
        deviceId: device,
        userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
        app: app || 'web',
        createdAt: FieldValue.serverTimestamp(),
    });

    // Upsert this device's session (id = uid_device so a re-login reuses it).
    const now = new Date().toISOString();
    await db.doc(`userSessions/${uid}_${device}`).set(
        { uid, deviceId: device, active: true, userAgent: userAgent || null, lastSeen: now },
        { merge: true },
    );

    // Enforce the cap: keep the newest MAX_DEVICES active, deactivate the rest.
    const activeSnap = await db.collection('userSessions').where('uid', '==', uid).where('active', '==', true).get();
    if (activeSnap.size > MAX_DEVICES) {
        const sorted = activeSnap.docs.sort((a, b) => (b.data().lastSeen || '').localeCompare(a.data().lastSeen || ''));
        const batch = db.batch();
        sorted.slice(MAX_DEVICES).forEach((d) => batch.update(d.ref, { active: false, kickedAt: now }));
        await batch.commit();
    }
    return { success: true, maxDevices: MAX_DEVICES };
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
