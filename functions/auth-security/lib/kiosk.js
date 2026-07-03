/**
 * Kiosk device pairing.
 * Admin creates a kiosk_devices doc with a short-lived pairing code
 * (createKioskPairingCode); the device exchanges the code for a Firebase
 * custom token whose user carries role:'kiosk' (exchangeKioskPairingCode).
 * Adapted from the source auth-token-exchange custom-token pattern.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');
const { audit, requireRole } = require('./util');

const PAIRING_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** main_admin only: create/refresh a pairing code for a kiosk device. */
const createKioskPairingCode = onCall(async (request) => {
    const byUid = requireRole(request, ['main_admin']);
    const label = String(request.data?.label || '').trim().slice(0, 80);
    const deviceId = request.data?.deviceId ? String(request.data.deviceId) : null;
    if (!label && !deviceId) throw new HttpsError('invalid-argument', 'label or deviceId required');

    const db = getFirestore();
    const code = crypto.randomInt(100000, 999999).toString(); // 6-digit
    const expiresAt = new Date(Date.now() + PAIRING_TTL_MS).toISOString();

    const ref = deviceId ? db.collection('kiosk_devices').doc(deviceId) : db.collection('kiosk_devices').doc();
    await ref.set(
        {
            id: ref.id,
            ...(label ? { label } : {}),
            pairingCode: code,
            pairingCodeExpiresAt: expiresAt,
            isActive: true,
            createdBy: byUid,
            updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
    );
    await audit('kiosk.pairing_code_created', { byUid, deviceId: ref.id });
    return { deviceId: ref.id, code, expiresAt };
});

/** Public: exchange a valid pairing code for a custom token (kiosk role). */
const exchangeKioskPairingCode = onCall(async (request) => {
    const code = String(request.data?.code || '').trim();
    if (!/^\d{6}$/.test(code)) throw new HttpsError('invalid-argument', 'Invalid code');

    const db = getFirestore();
    const snap = await db
        .collection('kiosk_devices')
        .where('pairingCode', '==', code)
        .where('isActive', '==', true)
        .limit(1)
        .get();
    if (snap.empty) throw new HttpsError('not-found', 'Code not recognized');

    const device = snap.docs[0];
    const data = device.data();
    if (!data.pairingCodeExpiresAt || new Date(data.pairingCodeExpiresAt) < new Date()) {
        throw new HttpsError('deadline-exceeded', 'Code expired — ask an admin for a new one');
    }

    // One auth user per device, uid = kiosk-<deviceId>.
    const kioskUid = `kiosk-${device.id}`;
    try {
        await admin.auth().getUser(kioskUid);
    } catch {
        await admin.auth().createUser({ uid: kioskUid, displayName: data.label || 'Kiosk device' });
    }
    await admin.auth().setCustomUserClaims(kioskUid, { role: 'kiosk', kioskDeviceId: device.id });

    // users doc so rules/UI can resolve the device; clear the used code.
    await db.doc(`users/${kioskUid}`).set(
        {
            id: kioskUid,
            uid: kioskUid,
            firstName: data.label || 'Kiosk',
            lastName: 'Device',
            email: '',
            role: 'kiosk',
            avatar: '',
            status: 'active',
        },
        { merge: true },
    );
    await device.ref.update({
        pairingCode: FieldValue.delete(),
        pairingCodeExpiresAt: FieldValue.delete(),
        pairedAt: new Date().toISOString(),
        pairedUid: kioskUid,
    });

    const token = await admin.auth().createCustomToken(kioskUid, { role: 'kiosk', kioskDeviceId: device.id });
    await audit('kiosk.paired', { uid: kioskUid, deviceId: device.id });
    return { token, deviceId: device.id, label: data.label || null };
});

module.exports = { createKioskPairingCode, exchangeKioskPairingCode };
