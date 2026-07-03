/**
 * payTeacher (callable) — "Pay & Reset" ported from the source TI Earnings tab.
 * Settles what the institute owes a teacher: unsettled online commission
 * (sales.teacherCommission since staff.lastReset) plus cash collected at venue
 * on the teacher's behalf (staff.manualBalance). Writes a teacher_payments log
 * row + ledger entry, then resets the counters.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { requirePerm } = require('./slip');
const { roundMoney } = require('./money');

/** Sum unsettled online commission for a teacher since their last reset. */
async function computeOwed(db, staffId, lastReset) {
    const snap = await db
        .collection('sales')
        .where('teacherId', '==', staffId)
        .where('status', '==', 'completed')
        .get();
    let commission = 0;
    snap.docs.forEach((d) => {
        const s = d.data();
        if (!lastReset || (s.completedAt || s.saleDate) > lastReset) {
            commission += s.teacherCommission || 0;
        }
    });
    return roundMoney(commission, 'LKR');
}

const getTeacherBalance = onCall(async (request) => {
    requirePerm(request, 'revenue');
    const { staffId } = request.data || {};
    if (!staffId) throw new HttpsError('invalid-argument', 'staffId required');

    const db = getFirestore();
    const staffDoc = await db.collection('staff').doc(String(staffId)).get();
    if (!staffDoc.exists) throw new HttpsError('not-found', 'Staff member not found');
    const staff = staffDoc.data();
    const commissionOwed = await computeOwed(db, String(staffId), staff.lastReset);
    return {
        commissionOwed,
        manualBalance: staff.manualBalance || 0,
        totalOwed: roundMoney(commissionOwed + (staff.manualBalance || 0), 'LKR'),
        lastReset: staff.lastReset || null,
    };
});

const payTeacher = onCall(async (request) => {
    const adminUid = requirePerm(request, 'revenue');
    const { staffId, note } = request.data || {};
    if (!staffId) throw new HttpsError('invalid-argument', 'staffId required');

    const db = getFirestore();
    const staffRef = db.collection('staff').doc(String(staffId));
    const staffDoc = await staffRef.get();
    if (!staffDoc.exists) throw new HttpsError('not-found', 'Staff member not found');
    const staff = staffDoc.data();

    // Compute owed OUTSIDE the tx (query), then settle atomically.
    const commissionOwed = await computeOwed(db, String(staffId), staff.lastReset);
    const manualPortion = staff.manualBalance || 0;
    const total = roundMoney(commissionOwed + manualPortion, 'LKR');
    if (total <= 0) throw new HttpsError('failed-precondition', 'Nothing owed to this teacher.');

    const now = new Date().toISOString();
    await db.runTransaction(async (tx) => {
        const fresh = await tx.get(staffRef);
        if ((fresh.data().lastReset || null) !== (staff.lastReset || null)) {
            throw new HttpsError('aborted', 'Balance changed — reload and retry.');
        }
        const payRef = db.collection('teacher_payments').doc();
        tx.set(payRef, {
            id: payRef.id,
            teacherId: String(staffId),
            teacherName: staff.name || '',
            amountPaid: total,
            manualPortion,
            commissionPortion: commissionOwed,
            paidAt: now,
            paidBy: adminUid,
            ...(note ? { note: String(note).slice(0, 500) } : {}),
        });
        const ledgerRef = db.collection('financial_ledger').doc();
        tx.set(ledgerRef, {
            id: ledgerRef.id,
            orderId: payRef.id,
            type: 'teacher_settlement',
            entries: [
                { account: `payable_teacher_${staffId}`, amount: total },
                { account: 'cash_institute', amount: -total },
            ],
            metadata: { teacherId: String(staffId) },
            createdAt: now,
        });
        tx.update(staffRef, { manualBalance: 0, lastReset: now });
    });

    return { success: true, amountPaid: total, paidAt: now };
});

module.exports = { payTeacher, getTeacherBalance };
