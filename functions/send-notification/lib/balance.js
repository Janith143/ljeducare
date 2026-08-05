/**
 * getSmsBalance (callable) — remaining Notify.lk credits, for the admin panel.
 *
 * Lives here rather than in the web app because the Notify.lk credentials are bound to
 * this codebase only. App Hosting deliberately does NOT hold them: the storefront never
 * needs to send SMS, and the same api_key that reads the balance can also spend it.
 *
 * Read-only — hits the `status` endpoint, which costs no credit.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { configured } = require('./channels');

/**
 * Anyone who can spend credits or flip the SMS toggles may see what is left:
 * 'communications' sends broadcasts, 'settings' owns the SMS switches.
 */
function requireBalanceAccess(request) {
    const role = request.auth?.token?.role;
    const perms = request.auth?.token?.perms || [];
    const ok =
        role === 'main_admin' ||
        (['manager', 'teacher_admin'].includes(role) &&
            (perms.includes('communications') || perms.includes('settings')));
    if (!ok) throw new HttpsError('permission-denied', "Requires 'communications' or 'settings' permission");
}

const getSmsBalance = onCall(
    { secrets: ['NOTIFYLK_USER_ID', 'NOTIFYLK_API_KEY', 'NOTIFYLK_SENDER_ID'] },
    async (request) => {
        requireBalanceAccess(request);

        const userId = process.env.NOTIFYLK_USER_ID;
        const apiKey = process.env.NOTIFYLK_API_KEY;
        const senderId = process.env.NOTIFYLK_SENDER_ID;

        // The sender mask is not a secret — showing it lets an admin confirm at a glance
        // which mask is actually live (the demo one silently drops real numbers).
        if (!configured(userId) || !configured(apiKey)) {
            return { configured: false, senderId: null, active: false, balance: null };
        }

        const params = new URLSearchParams({ user_id: userId, api_key: apiKey });
        try {
            const res = await fetch(`https://app.notify.lk/api/v1/status?${params}`);
            const data = await res.json().catch(() => ({}));
            // Notify.lk answers HTTP 200 with status:"error" for bad credentials, so the
            // HTTP status alone proves nothing.
            if (!res.ok || data.status !== 'success') {
                logger.warn(`SMS balance lookup rejected: ${JSON.stringify(data).slice(0, 200)}`);
                return {
                    configured: true,
                    senderId,
                    active: false,
                    balance: null,
                    error: data?.message || `http_${res.status}`,
                };
            }
            return {
                configured: true,
                senderId,
                active: !!data.data?.active,
                balance: Number(data.data?.acc_balance ?? 0),
                checkedAt: new Date().toISOString(),
            };
        } catch (e) {
            logger.error(`SMS balance lookup threw: ${e?.message}`);
            return { configured: true, senderId, active: false, balance: null, error: 'network_error' };
        }
    },
);

module.exports = { getSmsBalance };
