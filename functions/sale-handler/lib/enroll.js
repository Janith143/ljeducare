/**
 * initiateEnrollment (callable) — creates the sale for any payment path.
 * Ported from the source /initiate-enrollment with the wallet/commission-split
 * branches removed and full currency awareness added.
 *
 * Flow:  free item        → sale completed immediately (finalize path)
 *        method bank_slip → sale 'pending_slip' (student uploads slip next)
 *        method gateway   → sale 'pending_gateway' (paypal/marx handler takes over)
 * Idempotent: an existing reusable pending sale for the same item is returned
 * instead of minting a duplicate (ported hold-reuse pattern).
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');
const { loadItem, loadCurrencySettings } = require('./items');
const { resolvePrice, buildSaleSnapshot } = require('./money');
const { finalizeSale } = require('./finalize');

const METHODS = ['paypal', 'marx', 'bank_slip'];

function generateSaleId() {
    const stamp = Date.now().toString(36).toUpperCase();
    return `INV-${stamp}-${crypto.randomInt(1000, 9999)}`;
}

const initiateEnrollment = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');
    if (request.auth.token.role !== 'student') {
        throw new HttpsError('permission-denied', 'Only students can enroll');
    }

    const { itemId, itemType, currency = 'LKR', method = 'marx', purchaseMetadata } = request.data || {};
    if (!itemId || !itemType) throw new HttpsError('invalid-argument', 'itemId and itemType are required');

    const db = getFirestore();
    const [resolved, settings, studentDoc] = await Promise.all([
        loadItem(itemType, itemId).catch((e) => {
            throw new HttpsError('not-found', e.message);
        }),
        loadCurrencySettings(),
        db.collection('users').doc(uid).get(),
    ]);
    if (!studentDoc.exists) throw new HttpsError('failed-precondition', 'Student profile not found');
    const student = studentDoc.data();

    // Already enrolled → succeed idempotently.
    if ((student[resolved.enrollField] || []).map(String).includes(String(itemId))) {
        return { alreadyEnrolled: true };
    }

    let price;
    try {
        price = resolvePrice(resolved.pricing, currency, settings);
    } catch (e) {
        throw new HttpsError('invalid-argument', e.message);
    }

    // Reuse an existing pending sale for this item (idempotency; ported pattern).
    const existing = await db
        .collection('sales')
        .where('studentId', '==', uid)
        .where('itemId', '==', String(itemId))
        .where('itemType', '==', itemType)
        .get();
    const reusable = existing.docs
        .map((d) => d.data())
        .find((s) => ['pending_gateway', 'pending_slip'].includes(s.status));
    if (reusable && price.amount > 0) {
        return { sale: publicSale(reusable), resumed: true };
    }

    const saleId = generateSaleId();
    const snapshot =
        price.amount > 0
            ? buildSaleSnapshot(price, settings)
            : { currency, amount: 0, baseAmount: 0, fxRate: 1 };

    // Per-month weekly classes carry a coveredMonth (YYYY-MM) so access is tied to
    // the month paid for, not the sale date (pay-June-30-for-July works correctly).
    const isPerMonth = itemType === 'class' && resolved.item.weeklyPaymentOption === 'per_month';
    const requestedMonth = /^\d{4}-\d{2}$/.test(request.data?.coveredMonth || '') ? request.data.coveredMonth : null;
    const coveredMonth = isPerMonth ? requestedMonth || new Date().toISOString().slice(0, 7) : null;

    const sale = {
        id: saleId,
        studentId: uid,
        teacherId: resolved.teacherId,
        itemId: String(itemId),
        itemType,
        itemName: resolved.itemName,
        enrollField: resolved.enrollField,
        saleDate: new Date().toISOString(),
        ...(coveredMonth ? { coveredMonth } : {}),
        ...snapshot,
        status: price.amount === 0 ? 'pending_gateway' : method === 'bank_slip' ? 'pending_slip' : 'pending_gateway',
        gateway: price.amount === 0 ? 'manual' : method,
        paymentMethod: price.amount === 0 ? 'free' : method === 'bank_slip' ? 'bank_transfer' : 'gateway',
        ...(purchaseMetadata ? { purchaseMetadata } : {}),
        ...(resolved.freeSession ? { freeSession: true } : {}),
        ...(method === 'bank_slip' ? { pendingAdminApproval: true } : {}),
        studentSnapshot: {
            name: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
            studentId: uid,
            email: student.email ?? '',
            contactNumber: student.contactNumber ?? '',
        },
    };

    await db.collection('sales').doc(saleId).set(sale);

    if (price.amount === 0) {
        await finalizeSale(saleId, { gateway: 'manual', settledBy: 'free-enrollment' });
        return { sale: publicSale({ ...sale, status: 'completed' }), enrolled: true };
    }

    return { sale: publicSale(sale) };
});

/** Strip server-internal fields before returning a sale to the client. */
function publicSale(sale) {
    const { gatewayPayload, ...rest } = sale;
    void gatewayPayload;
    return rest;
}

module.exports = { initiateEnrollment, generateSaleId, METHODS };
