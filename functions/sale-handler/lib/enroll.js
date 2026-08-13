/**
 * initiateEnrollment (callable) — creates the sale for any payment path.
 * Ported from the source /initiate-enrollment with the wallet/commission-split
 * branches removed and full currency awareness added.
 *
 * Flow:  free item        → sale completed immediately (finalize path)
 *        method bank_slip → sale 'pending_slip' (student uploads slip next)
 *        method gateway   → sale 'pending_gateway' (paypal/onepay handler takes over)
 * Idempotent: an existing reusable pending sale for the same item is returned
 * instead of minting a duplicate (ported hold-reuse pattern).
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');
const { loadItem, loadCurrencySettings } = require('./items');
const { resolvePrice, buildSaleSnapshot } = require('./money');
const { finalizeSale } = require('./finalize');

const METHODS = ['paypal', 'onepay', 'bank_slip'];

function generateSaleId() {
    const stamp = Date.now().toString(36).toUpperCase();
    return `INV-${stamp}-${crypto.randomInt(1000, 9999)}`;
}

/** The field set a payment method implies — single source of truth for mint + reconcile. */
function methodFields(method) {
    const slip = method === 'bank_slip';
    return {
        status: slip ? 'pending_slip' : 'pending_gateway',
        gateway: method,
        paymentMethod: slip ? 'bank_transfer' : 'gateway',
    };
}

/**
 * Bring a reused pending sale in line with the payment method the student just chose.
 * Without this, a sale minted for one gateway (e.g. abandoned mid-flow) gets handed back
 * unchanged when the student switches methods — routing them to a page that 404s because
 * the sale's status never matched the new method. See payment/slip/[saleId] 404 (2026-08-13).
 */
async function reconcileReusedSale(db, sale, method, price, settings) {
    const want = methodFields(method);
    const repriced = sale.currency !== price.currency || sale.amount !== price.amount;
    if (sale.status === want.status && sale.gateway === want.gateway && !repriced) {
        return { sale };
    }
    // A submitted slip is already an in-flight admin task (slip.js approveSlipSale) — never repurpose it.
    if (sale.slipImageUrl) return { sale, blocked: 'awaiting_approval' };

    const update = { ...want, methodSwitchedAt: new Date().toISOString() };
    update.pendingAdminApproval = method === 'bank_slip' ? true : FieldValue.delete();
    if (repriced) Object.assign(update, buildSaleSnapshot(price, settings));
    if (sale.gatewayOrderId) {
        // Neutralize an abandoned gateway attempt: both onepayVerifyTransaction and
        // paypalCaptureOrder require gatewayOrderId, so clearing it makes the old
        // attempt unsettleable without touching the far side (no gateway API call needed).
        update.gatewayOrderId = FieldValue.delete();
        update.abandonedGatewayOrderIds = FieldValue.arrayUnion(sale.gatewayOrderId);
        update.gatewayAttempt = (sale.gatewayAttempt ?? 0) + 1;
    }
    const ref = db.collection('sales').doc(sale.id);
    await ref.update(update);
    const fresh = await ref.get();
    return { sale: fresh.data() }; // re-read: `update` held FieldValue sentinels, not real values
}

const initiateEnrollment = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');
    if (request.auth.token.role !== 'student') {
        throw new HttpsError('permission-denied', 'Only students can enroll');
    }

    const { itemId, itemType, currency = 'LKR', method, purchaseMetadata } = request.data || {};
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

    // Validated after pricing (free enrollments don't need a payment method) and before
    // any write — a dead/unsupported gateway must never get the chance to mint a sale.
    if (price.amount > 0 && !METHODS.includes(method)) {
        throw new HttpsError('invalid-argument', `Unsupported payment method: ${method ?? 'none'}`);
    }

    // Reuse an existing pending sale for this item (idempotency; ported pattern).
    const existing = await db
        .collection('sales')
        .where('studentId', '==', uid)
        .where('itemId', '==', String(itemId))
        .where('itemType', '==', itemType)
        .get();
    const reusable = existing.docs
        .map((d) => ({ id: d.id, ...d.data() })) // don't trust the stored `id` field alone
        .find((s) => ['pending_gateway', 'pending_slip'].includes(s.status));
    if (reusable && price.amount > 0) {
        const { sale: current, blocked } = await reconcileReusedSale(db, reusable, method, price, settings);
        return { sale: publicSale(current), resumed: true, ...(blocked ? { blocked } : {}) };
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

    // Free items settle immediately via the manual/free path; paid items take whichever
    // gateway the student chose (already validated against METHODS above).
    const methodInfo =
        price.amount === 0 ? { status: 'pending_gateway', gateway: 'manual', paymentMethod: 'free' } : methodFields(method);

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
        ...methodInfo,
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
