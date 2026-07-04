/**
 * Bank-transfer slip flow (ported from the source teacher-direct/slip pattern):
 *   student uploads slip image to Storage (payment-slips/) then attaches its URL
 *   to their pending_slip sale; an admin with the 'requests' permission approves
 *   (→ shared finalize) or rejects.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { finalizeSale } = require('./finalize');

function requirePerm(request, perm) {
    const role = request.auth?.token?.role;
    const perms = request.auth?.token?.perms || [];
    const ok =
        role === 'main_admin' ||
        (['manager', 'teacher_admin'].includes(role) && perms.includes(perm));
    if (!ok) throw new HttpsError('permission-denied', `Requires '${perm}' permission`);
    return request.auth.uid;
}

/** Student attaches an uploaded slip to their own pending_slip sale. */
const attachPaymentSlip = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');
    const { saleId, slipImageUrl } = request.data || {};
    if (!saleId || typeof slipImageUrl !== 'string' || !slipImageUrl.startsWith('https://')) {
        throw new HttpsError('invalid-argument', 'saleId and a valid slipImageUrl are required');
    }

    const ref = getFirestore().collection('sales').doc(String(saleId));
    const doc = await ref.get();
    if (!doc.exists) throw new HttpsError('not-found', 'Sale not found');
    const sale = doc.data();
    if (sale.studentId !== uid) throw new HttpsError('permission-denied', 'Not your sale');
    if (sale.status !== 'pending_slip') {
        throw new HttpsError('failed-precondition', `Sale is not awaiting a slip (${sale.status})`);
    }

    await ref.update({ slipImageUrl, slipUploadedAt: new Date().toISOString() });
    return { success: true };
});

/** Student attaches ONE uploaded slip to every pending_slip sale in a cart order. */
const attachOrderSlip = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');
    const { orderId, slipImageUrl } = request.data || {};
    if (!orderId || typeof slipImageUrl !== 'string' || !slipImageUrl.startsWith('https://')) {
        throw new HttpsError('invalid-argument', 'orderId and a valid slipImageUrl are required');
    }

    const db = getFirestore();
    const orderRef = db.collection('orders').doc(String(orderId));
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) throw new HttpsError('not-found', 'Order not found');
    const order = orderDoc.data();
    if (order.studentId !== uid) throw new HttpsError('permission-denied', 'Not your order');

    const now = new Date().toISOString();
    const batch = db.batch();
    for (const sid of order.saleIds || []) {
        batch.update(db.collection('sales').doc(String(sid)), { slipImageUrl, slipUploadedAt: now });
    }
    batch.update(orderRef, { slipImageUrl, slipUploadedAt: now });
    await batch.commit();
    return { success: true };
});

/** Admin approves a slip sale — confirms the received amount, then settles. */
const approveSlipSale = onCall(async (request) => {
    const adminUid = requirePerm(request, 'requests');
    const { saleId, confirmedAmount } = request.data || {};
    if (!saleId) throw new HttpsError('invalid-argument', 'saleId required');

    const ref = getFirestore().collection('sales').doc(String(saleId));
    const doc = await ref.get();
    if (!doc.exists) throw new HttpsError('not-found', 'Sale not found');
    const sale = doc.data();
    if (sale.status !== 'pending_slip') {
        throw new HttpsError('failed-precondition', `Sale is not awaiting approval (${sale.status})`);
    }
    if (!sale.slipImageUrl) throw new HttpsError('failed-precondition', 'No slip uploaded yet');
    // Guard against approving a slip whose paid amount differs from the sale.
    if (confirmedAmount !== undefined && Number(confirmedAmount) !== sale.amount) {
        throw new HttpsError(
            'failed-precondition',
            `Confirmed amount ${confirmedAmount} ≠ sale amount ${sale.amount} ${sale.currency}. Reject and re-create instead.`,
        );
    }

    await ref.update({ pendingAdminApproval: false });
    const result = await finalizeSale(String(saleId), { gateway: 'bank_slip', settledBy: adminUid });
    return { success: true, ...result };
});

/** Admin rejects a slip sale with a reason; student may retry checkout. */
const rejectSlipSale = onCall(async (request) => {
    const adminUid = requirePerm(request, 'requests');
    const { saleId, reason } = request.data || {};
    if (!saleId) throw new HttpsError('invalid-argument', 'saleId required');

    const ref = getFirestore().collection('sales').doc(String(saleId));
    const doc = await ref.get();
    if (!doc.exists) throw new HttpsError('not-found', 'Sale not found');
    if (doc.data().status !== 'pending_slip') {
        throw new HttpsError('failed-precondition', 'Sale is not awaiting approval');
    }

    await ref.update({
        status: 'canceled',
        rejectionReason: String(reason || 'Slip rejected'),
        canceledAt: new Date().toISOString(),
        canceledBy: adminUid,
    });
    return { success: true };
});

module.exports = { attachPaymentSlip, attachOrderSlip, approveSlipSale, rejectSlipSale, requirePerm };
