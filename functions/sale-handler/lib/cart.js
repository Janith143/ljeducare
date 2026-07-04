/**
 * initiateCartCheckout (callable) — one payment for many items (courses + quizzes).
 * Creates N pending sales sharing an `orderId` + an `orders/{orderId}` grouping doc;
 * a single gateway payment (or one bank slip) then finalizes every sale, so each
 * teacher's commission is credited independently via the shared finalize path.
 * Free items are finalized immediately. Never trusts client prices.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');
const { loadItem, loadCurrencySettings } = require('./items');
const { resolvePrice, buildSaleSnapshot } = require('./money');
const { finalizeSale } = require('./finalize');
const { generateSaleId } = require('./enroll');

const CART_TYPES = ['course', 'quiz'];
const MAX_ITEMS = 20;

function generateOrderId() {
    const stamp = Date.now().toString(36).toUpperCase();
    return `ORD-${stamp}-${crypto.randomInt(1000, 9999)}`;
}

const initiateCartCheckout = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');
    if (request.auth.token.role !== 'student') throw new HttpsError('permission-denied', 'Only students can checkout');

    const { items = [], currency = 'LKR', method = 'paypal' } = request.data || {};
    if (!Array.isArray(items) || items.length === 0) throw new HttpsError('invalid-argument', 'Cart is empty');
    if (items.length > MAX_ITEMS) throw new HttpsError('invalid-argument', 'Too many items in the cart');

    const db = getFirestore();
    const [settings, studentDoc] = await Promise.all([loadCurrencySettings(), db.collection('users').doc(uid).get()]);
    if (!studentDoc.exists) throw new HttpsError('failed-precondition', 'Student profile not found');
    const student = studentDoc.data();
    const enrolled = {
        course: new Set((student.enrolledCourseIds || []).map(String)),
        quiz: new Set((student.enrolledQuizIds || []).map(String)),
    };
    const studentSnapshot = {
        name: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
        studentId: uid,
        email: student.email ?? '',
        contactNumber: student.contactNumber ?? '',
    };

    const orderId = generateOrderId();
    const paidSaleIds = [];
    const freeSaleIds = [];
    let amount = 0;
    let baseAmount = 0;
    const seen = new Set();

    for (const raw of items) {
        const itemType = String(raw?.itemType || '');
        const itemId = String(raw?.itemId || '');
        if (!CART_TYPES.includes(itemType) || !itemId) continue;
        const dk = `${itemType}:${itemId}`;
        if (seen.has(dk)) continue;
        seen.add(dk);
        if (enrolled[itemType]?.has(itemId)) continue; // already owns it

        let resolved;
        try { resolved = await loadItem(itemType, itemId); } catch { continue; } // unavailable → skip

        let price;
        try { price = resolvePrice(resolved.pricing, currency, settings); }
        catch (e) { throw new HttpsError('invalid-argument', e.message); }

        const isPaid = price.amount > 0;
        const snapshot = isPaid ? buildSaleSnapshot(price, settings) : { currency, amount: 0, baseAmount: 0, fxRate: 1 };
        const saleId = generateSaleId();
        const sale = {
            id: saleId,
            orderId,
            studentId: uid,
            teacherId: resolved.teacherId,
            itemId,
            itemType,
            itemName: resolved.itemName,
            enrollField: resolved.enrollField,
            saleDate: new Date().toISOString(),
            ...snapshot,
            status: isPaid ? (method === 'bank_slip' ? 'pending_slip' : 'pending_gateway') : 'pending_gateway',
            gateway: isPaid ? method : 'manual',
            paymentMethod: isPaid ? (method === 'bank_slip' ? 'bank_transfer' : 'gateway') : 'free',
            ...(isPaid && method === 'bank_slip' ? { pendingAdminApproval: true } : {}),
            studentSnapshot,
        };
        await db.collection('sales').doc(saleId).set(sale);

        if (isPaid) { paidSaleIds.push(saleId); amount += price.amount; baseAmount += snapshot.baseAmount; }
        else freeSaleIds.push(saleId);
    }

    if (paidSaleIds.length === 0 && freeSaleIds.length === 0) {
        return { enrolled: true, empty: true }; // everything was already owned / unavailable
    }

    // Free items settle right away.
    for (const sid of freeSaleIds) await finalizeSale(sid, { gateway: 'manual', settledBy: 'cart-free' });

    if (paidSaleIds.length === 0) return { enrolled: true }; // all free

    amount = Math.round(amount * 100) / 100;
    baseAmount = Math.round(baseAmount * 100) / 100;
    await db.collection('orders').doc(orderId).set({
        orderId,
        studentId: uid,
        saleIds: paidSaleIds,
        freeSaleIds,
        currency,
        amount,
        baseAmount,
        status: method === 'bank_slip' ? 'pending_slip' : 'pending_gateway',
        gateway: method,
        createdAt: new Date().toISOString(),
    });

    return { orderId, amount, currency, itemCount: paidSaleIds.length };
});

module.exports = { initiateCartCheckout, generateOrderId };
