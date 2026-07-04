/**
 * PayPal webhook — the reconciliation backstop (mirrors the source Marx
 * stuck-hold reconciler role). Signature-verified; idempotent via the shared
 * finalize transaction (a completed sale no-ops).
 * Register in the PayPal app for: PAYMENT.CAPTURE.COMPLETED / DENIED / REFUNDED.
 */
const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getFirestore } = require('firebase-admin/firestore');
const { verifyWebhookSignature } = require('./client');
const { finalizeSale } = require('../finalize');
const { finalizeOrder } = require('./cartOrders');

/** custom_id starting `ORD-` is a cart order (many sales); otherwise a single sale. */
const isOrder = (id) => typeof id === 'string' && id.startsWith('ORD-');

const paypalWebhook = onRequest(
    { secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'] },
    async (req, res) => {
        if (req.method !== 'POST') return res.status(405).send('POST only');

        const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body);
        try {
            const verified = await verifyWebhookSignature(req.headers, rawBody);
            if (!verified) {
                logger.warn('paypalWebhook: signature verification FAILED');
                return res.status(400).json({ error: 'bad signature' });
            }
        } catch (e) {
            logger.error('paypalWebhook: verification error', e.message);
            return res.status(400).json({ error: 'verification error' });
        }

        const event = req.body;
        const resource = event?.resource || {};
        const saleId = resource.custom_id || resource.supplementary_data?.related_ids?.order_id;
        logger.info(`paypalWebhook: ${event.event_type} sale=${saleId}`);

        try {
            switch (event.event_type) {
                case 'PAYMENT.CAPTURE.COMPLETED': {
                    if (!resource.custom_id) break;
                    const ctx = { gateway: 'paypal', gatewayCaptureId: resource.id, settledBy: 'paypal-webhook' };
                    if (isOrder(resource.custom_id)) await finalizeOrder(String(resource.custom_id), ctx);
                    else await finalizeSale(String(resource.custom_id), ctx);
                    break;
                }
                case 'PAYMENT.CAPTURE.DENIED': {
                    if (!resource.custom_id) break;
                    if (isOrder(resource.custom_id)) await markOrderFailed(String(resource.custom_id));
                    else await markFailed(String(resource.custom_id), 'Capture denied by PayPal');
                    break;
                }
                case 'PAYMENT.CAPTURE.REFUNDED': {
                    if (!resource.custom_id) break;
                    await markRefunded(String(resource.custom_id), resource.id);
                    break;
                }
                default:
                    break; // acknowledge unhandled event types
            }
            return res.status(200).json({ received: true });
        } catch (e) {
            logger.error('paypalWebhook handler error', e.message);
            // Non-2xx makes PayPal retry — desirable for transient failures.
            return res.status(500).json({ error: e.message });
        }
    },
);

async function markOrderFailed(orderId) {
    const ref = getFirestore().collection('orders').doc(orderId);
    const doc = await ref.get();
    if (!doc.exists || doc.data().status === 'completed') return;
    await ref.update({ status: 'failed', failedAt: new Date().toISOString() });
}

async function markFailed(saleId, reason) {
    const ref = getFirestore().collection('sales').doc(saleId);
    const doc = await ref.get();
    if (!doc.exists || doc.data().status === 'completed') return;
    await ref.update({ status: 'failed', rejectionReason: reason, failedAt: new Date().toISOString() });
}

async function markRefunded(saleId, refundId) {
    const ref = getFirestore().collection('sales').doc(saleId);
    const doc = await ref.get();
    if (!doc.exists) return;
    // Access is NOT auto-revoked — admins handle enrollment removal case-by-case
    // (ported behavior; refunds are rare and human-reviewed).
    await ref.update({
        status: 'refunded',
        refundedAt: new Date().toISOString(),
        refundedBy: 'paypal-webhook',
        gatewayRefundId: refundId || null,
    });
}

module.exports = { paypalWebhook };
