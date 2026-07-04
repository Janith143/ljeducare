/**
 * PayPal for CART orders. One PayPal order (custom_id = orderId) pays the whole cart
 * total; capture then finalizes every sale in the order. Amount comes from the order
 * doc (priced server-side by initiateCartCheckout) — never the client.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { paypalFetch } = require('./client');
const { toGatewayValue } = require('../money');
const { finalizeSale } = require('../finalize');

const paypalCreateCartOrder = onCall({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');
    const { orderId } = request.data || {};
    if (!orderId) throw new HttpsError('invalid-argument', 'orderId required');

    const db = getFirestore();
    const ref = db.collection('orders').doc(String(orderId));
    const doc = await ref.get();
    if (!doc.exists) throw new HttpsError('not-found', 'Order not found');
    const order = doc.data();
    if (order.studentId !== uid) throw new HttpsError('permission-denied', 'Not your order');
    if (order.status === 'completed') return { alreadyCompleted: true };
    if (order.status !== 'pending_gateway' || !(order.amount > 0)) {
        throw new HttpsError('failed-precondition', `Order not payable via PayPal (${order.status})`);
    }

    if (order.gatewayOrderId) {
        try {
            const existing = await paypalFetch(`/v2/checkout/orders/${order.gatewayOrderId}`);
            if (['CREATED', 'APPROVED', 'PAYER_ACTION_REQUIRED'].includes(existing.status)) {
                return { orderId: existing.id, approveUrl: approveLink(existing) };
            }
        } catch { /* mint fresh */ }
    }

    const siteUrl = (process.env.PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const created = await paypalFetch('/v2/checkout/orders', {
        method: 'POST',
        body: {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    custom_id: String(orderId),
                    description: `${order.saleIds.length} item(s) — ${process.env.PUBLIC_SITE_NAME || 'LJ Educare'}`.slice(0, 127),
                    amount: {
                        currency_code: order.currency,
                        value: toGatewayValue({ amount: order.amount, currency: order.currency }),
                    },
                },
            ],
            application_context: {
                brand_name: process.env.PUBLIC_SITE_NAME || 'LJ Educare',
                user_action: 'PAY_NOW',
                return_url: `${siteUrl}/payment/redirect?orderId=${encodeURIComponent(orderId)}`,
                cancel_url: `${siteUrl}/payment/order/${encodeURIComponent(orderId)}`,
            },
        },
        headers: { 'PayPal-Request-Id': `order-${orderId}` },
    });

    await ref.update({ gateway: 'paypal', gatewayOrderId: created.id });
    return { orderId: created.id, approveUrl: approveLink(created) };
});

const paypalCaptureCartOrder = onCall({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');
    const { orderId } = request.data || {};
    if (!orderId) throw new HttpsError('invalid-argument', 'orderId required');

    const db = getFirestore();
    const ref = db.collection('orders').doc(String(orderId));
    const doc = await ref.get();
    if (!doc.exists) throw new HttpsError('not-found', 'Order not found');
    const order = doc.data();
    if (order.studentId !== uid) throw new HttpsError('permission-denied', 'Not your order');
    if (order.status === 'completed') return { success: true, alreadyCompleted: true };
    if (!order.gatewayOrderId) throw new HttpsError('failed-precondition', 'No PayPal order for this cart');

    let capture;
    try {
        capture = await paypalFetch(`/v2/checkout/orders/${order.gatewayOrderId}/capture`, {
            method: 'POST',
            headers: { 'PayPal-Request-Id': `capture-${orderId}` },
        });
    } catch (e) {
        if (e.paypal?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
            capture = await paypalFetch(`/v2/checkout/orders/${order.gatewayOrderId}`);
        } else {
            throw new HttpsError('aborted', e.message);
        }
    }

    const cap = capture.purchase_units?.[0]?.payments?.captures?.[0];
    if (!cap || cap.status !== 'COMPLETED') {
        throw new HttpsError('failed-precondition', `Capture not completed (${cap?.status || capture.status})`);
    }
    if (cap.amount.currency_code !== order.currency || Number(cap.amount.value) !== order.amount) {
        throw new HttpsError('failed-precondition', `Captured ${cap.amount.value} ${cap.amount.currency_code} ≠ order ${order.amount} ${order.currency}`);
    }

    await finalizeOrder(String(orderId), { gateway: 'paypal', gatewayCaptureId: cap.id, settledBy: 'paypal-capture' });
    return { success: true };
});

/** Finalize every sale in an order, then mark the order completed. Idempotent. */
async function finalizeOrder(orderId, context) {
    const db = getFirestore();
    const ref = db.collection('orders').doc(orderId);
    const doc = await ref.get();
    if (!doc.exists) throw new Error(`Order ${orderId} not found`);
    const order = doc.data();
    for (const sid of order.saleIds || []) {
        await finalizeSale(sid, context);
    }
    if (order.status !== 'completed') {
        await ref.update({
            status: 'completed',
            completedAt: new Date().toISOString(),
            ...(context.gatewayCaptureId ? { gatewayCaptureId: context.gatewayCaptureId } : {}),
        });
    }
}

function approveLink(order) {
    return order.links?.find((l) => l.rel === 'approve' || l.rel === 'payer-action')?.href ?? null;
}

module.exports = { paypalCreateCartOrder, paypalCaptureCartOrder, finalizeOrder };
