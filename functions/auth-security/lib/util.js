const { logger } = require('firebase-functions');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

/** Best-effort audit-log writer (activity_logs). */
async function audit(action, params = {}) {
    try {
        await getFirestore().collection('activity_logs').add({
            action,
            params,
            performedBy: params.byUid || params.uid || 'SYSTEM',
            userRole: params.role || null,
            level: 'INFO',
            timestamp: new Date().toISOString(),
            createdAt: FieldValue.serverTimestamp(),
        });
    } catch (e) {
        logger.warn('audit write failed', e?.message);
    }
}

/** Assert the callable caller has one of the given role claims; returns the caller uid. */
function requireRole(request, roles) {
    const { HttpsError } = require('firebase-functions/v2/https');
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');
    const role = request.auth?.token?.role;
    if (!roles.includes(role)) {
        throw new HttpsError('permission-denied', `Requires role: ${roles.join(' | ')}`);
    }
    return uid;
}

module.exports = { audit, requireRole };
