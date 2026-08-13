/**
 * OnePay checkout lifecycle (Redirection Payment API). Amounts always come from the
 * pending sale doc (priced server-side by initiateEnrollment) — never the client.
 * reference = saleId ties every OnePay transaction back to our sale.
 *
 * Unlike PayPal, OnePay has no documented "read back this transaction" endpoint
 * before payment — so unlike paypalCreateOrder, this does NOT try to reuse/refetch a
 * previous attempt's redirect URL. A re-click always mints a fresh OnePay transaction;
 * any prior attempt's id is retired into abandonedGatewayOrderIds first. Don't "fix"
 * this into matching PayPal's reuse pattern — there is nothing to fetch it back from.
 *
 * There is also no separate "capture" step: by the time the customer is back on
 * transaction_redirect_url, OnePay has already decided the outcome. onepayVerifyTransaction
 * just asks the status endpoint what happened and settles — it never trusts anything the
 * browser carried back in the URL, per OnePay's own docs guidance.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onepayFetch, generateHash, toE164LK } = require('./client');
const { toGatewayValue } = require('../money');
const { finalizeSale } = require('../finalize');

const ONEPAY_SECRETS = ['ONEPAY_APP_ID', 'ONEPAY_APP_TOKEN', 'ONEPAY_HASH_SALT'];

/** Create a fresh OnePay checkout link for a pending_gateway sale. */
const onepayCreateCheckout = onCall({ secrets: ONEPAY_SECRETS }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');
    const { saleId } = request.data || {};
    if (!saleId) throw new HttpsError('invalid-argument', 'saleId required');

    const db = getFirestore();
    const saleRef = db.collection('sales').doc(String(saleId));
    const saleDoc = await saleRef.get();
    if (!saleDoc.exists) throw new HttpsError('not-found', 'Sale not found');
    const sale = saleDoc.data();
    if (sale.studentId !== uid) throw new HttpsError('permission-denied', 'Not your sale');
    if (sale.status === 'completed') return { alreadyCompleted: true };
    if (sale.status !== 'pending_gateway' || !(sale.amount > 0)) {
        throw new HttpsError('failed-precondition', `Sale not payable via OnePay (${sale.status})`);
    }

    const { firstName, lastName } = splitName(sale.studentSnapshot?.name);
    const amount = toGatewayValue({ amount: sale.amount, currency: sale.currency });
    const siteUrl = (process.env.PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

    const payload = {
        app_id: process.env.ONEPAY_APP_ID,
        amount,
        currency: sale.currency,
        hash: generateHash(sale.currency, amount),
        reference: String(saleId), // OnePay requires >=10 chars; INV-XXXXXXXX-NNNN satisfies this
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_phone_number: toE164LK(sale.studentSnapshot?.contactNumber),
        customer_email: sale.studentSnapshot?.email || '',
        transaction_redirect_url: `${siteUrl}/payment/redirect?saleId=${encodeURIComponent(saleId)}&gateway=onepay`,
        additionalData: String(saleId), // redundant lookup key — the webhook payload carries no other merchant reference
    };

    let response;
    try {
        response = await onepayFetch('/v3/checkout/link/', { body: payload });
    } catch (e) {
        logger.error('onepayCreateCheckout: create failed', { saleId, error: e.message, onepay: e.onepay });
        throw new HttpsError('aborted', e.message);
    }

    // Response shape confirmed from OnePay's own PHP SDK source (nested under data.gateway);
    // fall back to flatter shapes defensively in case the live API differs from the SDK's assumption.
    const redirectUrl =
        response?.data?.gateway?.redirect_url ?? response?.data?.redirect_url ?? response?.redirect_url ?? null;
    const transactionId =
        response?.data?.gateway?.ipg_transaction_id ??
        response?.data?.ipg_transaction_id ??
        response?.ipg_transaction_id ??
        null;
    logger.info('onepayCreateCheckout: response', { saleId, redirectUrl, transactionId, raw: response });
    if (!redirectUrl) {
        throw new HttpsError('failed-precondition', 'OnePay did not return a redirect URL.');
    }

    const update = { gateway: 'onepay', gatewayReference: String(saleId) };
    // Retire an earlier abandoned attempt (this sale was reused for a retry) before minting the new one.
    if (sale.gatewayOrderId) {
        update.abandonedGatewayOrderIds = FieldValue.arrayUnion(sale.gatewayOrderId);
    }
    update.gatewayOrderId = transactionId;
    await saleRef.update(update);

    return { redirectUrl };
});

/** Verify a OnePay transaction's outcome and settle (called from /payment/redirect). */
const onepayVerifyTransaction = onCall({ secrets: ONEPAY_SECRETS }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');
    const { saleId } = request.data || {};
    if (!saleId) throw new HttpsError('invalid-argument', 'saleId required');

    const db = getFirestore();
    const saleDoc = await db.collection('sales').doc(String(saleId)).get();
    if (!saleDoc.exists) throw new HttpsError('not-found', 'Sale not found');
    const sale = saleDoc.data();
    if (sale.studentId !== uid) throw new HttpsError('permission-denied', 'Not your sale');
    if (sale.status === 'completed') return { success: true, alreadyCompleted: true };
    if (!['pending_gateway', 'hold'].includes(sale.status)) {
        throw new HttpsError('failed-precondition', `Sale is no longer a gateway payment (${sale.status})`);
    }
    if (!sale.gatewayOrderId) throw new HttpsError('failed-precondition', 'No OnePay transaction for this sale');

    const result = await verifyAndFinalize(db, String(saleId), sale, 'onepay-verify');
    return { success: true, ...result };
});

/**
 * Shared by onepayVerifyTransaction and the webhook backstop: re-check the status
 * endpoint (never trust a caller-supplied outcome) and settle if paid.
 */
async function verifyAndFinalize(db, saleId, sale, settledBy) {
    const status = await onepayFetch('/v3/transaction/status/', {
        body: { app_id: process.env.ONEPAY_APP_ID, onepay_transaction_id: sale.gatewayOrderId },
    });
    logger.info('onepay status check', { saleId, raw: status });

    // Shape unconfirmed against a live response — docs show these as top-level; parse defensively.
    const paid = status?.data?.status ?? status?.status;
    const paidAmount = Number(status?.data?.amount ?? status?.amount);
    const paidCurrency = status?.data?.currency ?? status?.currency;

    if (paid !== true) {
        throw new HttpsError('failed-precondition', `OnePay transaction not paid (status: ${paid})`);
    }
    if (paidCurrency && paidCurrency !== sale.currency) {
        throw new HttpsError('failed-precondition', `Paid ${paidCurrency} ≠ sale ${sale.currency}`);
    }
    if (Number.isFinite(paidAmount) && paidAmount !== sale.amount) {
        throw new HttpsError('failed-precondition', `Paid ${paidAmount} ≠ sale ${sale.amount}`);
    }

    return finalizeSale(saleId, { gateway: 'onepay', gatewayCaptureId: sale.gatewayOrderId, settledBy });
}

function splitName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: 'Student', lastName: '-' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '-' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

module.exports = { onepayCreateCheckout, onepayVerifyTransaction, verifyAndFinalize };
