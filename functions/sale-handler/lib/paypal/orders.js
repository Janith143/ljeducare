/**
 * PayPal order lifecycle. Amounts always come from the pending sale doc
 * (which was priced server-side by initiateEnrollment) — never the client.
 * custom_id = saleId ties every PayPal event back to our sale.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { paypalFetch } = require('./client');
const { toGatewayValue } = require('../money');
const { finalizeSale } = require('../finalize');

/** Create (or reuse) a PayPal order for a pending_gateway sale. */
const paypalCreateOrder = onCall({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] }, async (request) => {
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
        throw new HttpsError('failed-precondition', `Sale not payable via PayPal (${sale.status})`);
    }

    // Reuse a still-open PayPal order (idempotent retry).
    if (sale.gatewayOrderId) {
        try {
            const existing = await paypalFetch(`/v2/checkout/orders/${sale.gatewayOrderId}`);
            if (['CREATED', 'APPROVED', 'PAYER_ACTION_REQUIRED'].includes(existing.status)) {
                return { orderId: existing.id, status: existing.status, approveUrl: approveLink(existing) };
            }
        } catch {
            // fall through — mint a fresh order
        }
    }

    const siteUrl = (process.env.PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const order = await paypalFetch('/v2/checkout/orders', {
        method: 'POST',
        body: {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    custom_id: String(saleId),
                    description: String(sale.itemName || 'Enrollment').slice(0, 127),
                    amount: {
                        currency_code: sale.currency,
                        value: toGatewayValue({ amount: sale.amount, currency: sale.currency }),
                    },
                },
            ],
            application_context: {
                brand_name: process.env.PUBLIC_SITE_NAME || 'LJ Educare',
                user_action: 'PAY_NOW',
                return_url: `${siteUrl}/payment/redirect?saleId=${encodeURIComponent(saleId)}`,
                cancel_url: `${siteUrl}/payment/failed/${encodeURIComponent(saleId)}`,
            },
        },
        headers: { 'PayPal-Request-Id': `order-${saleId}` }, // PayPal-side idempotency
    });

    await saleRef.update({ gateway: 'paypal', gatewayOrderId: order.id });
    return { orderId: order.id, status: order.status, approveUrl: approveLink(order) };
});

/** Capture an approved order (called from /payment/redirect). */
const paypalCaptureOrder = onCall({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] }, async (request) => {
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
        // The sale was reconciled to another method (e.g. bank_slip) after this PayPal
        // order was created — don't let a stale approval still capture it.
        throw new HttpsError('failed-precondition', `Sale is no longer a gateway payment (${sale.status})`);
    }
    if (!sale.gatewayOrderId) throw new HttpsError('failed-precondition', 'No PayPal order for this sale');

    let capture;
    try {
        capture = await paypalFetch(`/v2/checkout/orders/${sale.gatewayOrderId}/capture`, {
            method: 'POST',
            headers: { 'PayPal-Request-Id': `capture-${saleId}` },
        });
    } catch (e) {
        // Already captured (webhook or a parallel call won) → verify + settle.
        if (e.paypal?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
            capture = await paypalFetch(`/v2/checkout/orders/${sale.gatewayOrderId}`);
        } else {
            throw new HttpsError('aborted', e.message);
        }
    }

    const unit = capture.purchase_units?.[0];
    const cap = unit?.payments?.captures?.[0];
    if (!cap || cap.status !== 'COMPLETED') {
        throw new HttpsError('failed-precondition', `Capture not completed (${cap?.status || capture.status})`);
    }
    // Amount/currency must match the priced sale exactly.
    if (cap.amount.currency_code !== sale.currency || Number(cap.amount.value) !== sale.amount) {
        throw new HttpsError(
            'failed-precondition',
            `Captured ${cap.amount.value} ${cap.amount.currency_code} ≠ sale ${sale.amount} ${sale.currency}`,
        );
    }

    const result = await finalizeSale(String(saleId), {
        gateway: 'paypal',
        gatewayCaptureId: cap.id,
        settledBy: 'paypal-capture',
    });
    return { success: true, ...result };
});

function approveLink(order) {
    return order.links?.find((l) => l.rel === 'approve' || l.rel === 'payer-action')?.href ?? null;
}

module.exports = { paypalCreateOrder, paypalCaptureOrder };
