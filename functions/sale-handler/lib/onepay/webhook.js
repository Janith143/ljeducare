/**
 * OnePay webhook — reconciliation backstop, registered as a single static URL in the
 * OnePay merchant dashboard's APP section (not passed per-request, unlike PayPal).
 *
 * OnePay's callback carries NO signature (confirmed: docs.onepay.lk's own guidance is
 * "always verify server-side, do not rely solely on URL parameters / callback data" —
 * there is no hash/signature field documented on the callback payload at all). So unlike
 * paypal/webhook.js, this handler must NEVER trust req.body.status — it only uses the
 * callback as a trigger to re-check the status endpoint via the same verifyAndFinalize
 * path onepayVerifyTransaction uses, and settles only on a verified outcome.
 *
 * This is more load-bearing than the PayPal backstop: OnePay has no separate "capture"
 * step, so if the student's browser closes before the /payment/redirect JS handler runs,
 * this webhook may be the ONLY confirmation that ever arrives.
 */
const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getFirestore } = require('firebase-admin/firestore');
const { verifyAndFinalize } = require('./checkout');

const ONEPAY_SECRETS = ['ONEPAY_APP_ID', 'ONEPAY_APP_TOKEN', 'ONEPAY_HASH_SALT'];

const onepayWebhook = onRequest({ secrets: ONEPAY_SECRETS }, async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('POST only');

    const body = req.body || {};
    const transactionId = body.transaction_id;
    const additionalData = body.additional_data;
    logger.info('onepayWebhook: received', { transactionId, status: body.status, additionalData });

    if (!transactionId) return res.status(200).json({ received: true, skipped: 'no transaction_id' });

    try {
        const db = getFirestore();
        const sale = await findSaleByTransactionId(db, transactionId, additionalData);
        if (!sale) {
            logger.warn('onepayWebhook: no matching sale', { transactionId, additionalData });
            return res.status(200).json({ received: true, skipped: 'sale not found' });
        }
        if (sale.status === 'completed') {
            return res.status(200).json({ received: true, alreadyCompleted: true });
        }
        if (!['pending_gateway', 'hold'].includes(sale.status)) {
            logger.info('onepayWebhook: sale no longer a gateway payment', { saleId: sale.id, status: sale.status });
            return res.status(200).json({ received: true, skipped: `status ${sale.status}` });
        }

        // Never trust body.status — re-verify server-side via the status endpoint.
        await verifyAndFinalize(db, sale.id, sale, 'onepay-webhook');
        return res.status(200).json({ received: true, settled: true });
    } catch (e) {
        logger.error('onepayWebhook handler error', { transactionId, error: e.message });
        // Non-2xx so OnePay retries (if it does) — desirable for transient failures
        // (e.g. our own status-check call timing out). A genuinely unpaid transaction
        // fails verifyAndFinalize every retry and just never settles, which is correct.
        return res.status(500).json({ error: e.message });
    }
});

async function findSaleByTransactionId(db, transactionId, additionalData) {
    if (additionalData) {
        const direct = await db.collection('sales').doc(String(additionalData)).get();
        if (direct.exists && direct.data().gatewayOrderId === transactionId) {
            return { id: direct.id, ...direct.data() };
        }
    }
    const query = await db.collection('sales').where('gatewayOrderId', '==', transactionId).limit(1).get();
    if (query.empty) return null;
    const doc = query.docs[0];
    return { id: doc.id, ...doc.data() };
}

module.exports = { onepayWebhook };
