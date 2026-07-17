/**
 * Shared settlement path — ALL payment routes (free, PayPal capture/webhook,
 * Marx callback, slip approval) converge here. Inside ONE Firestore transaction:
 *   sale → completed, student enrollment array union, two-way commission split
 *   (teacherCommission + instituteIncome = baseAmount), staff counters, ledger row.
 * Idempotent: a sale already 'completed' is a no-op.
 */
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { roundMoney } = require('./money');

/** Split baseAmount (LKR) by the teacher's commission %. */
function splitCommission(baseAmount, commissionRate) {
    const rate = Math.min(100, Math.max(0, Number(commissionRate) || 0));
    const teacherCommission = roundMoney((baseAmount * rate) / 100, 'LKR');
    return { teacherCommission, instituteIncome: roundMoney(baseAmount - teacherCommission, 'LKR'), rate };
}

/**
 * Should this settled sale send the student a payment receipt?
 *
 * Excludes the money-less bookkeeping sales that also flow through here:
 * - the Rs.5 attendance-marking fee and free-session grants — every kiosk scan
 *   creates one, so without this a scan would fire a "payment received" SMS on top
 *   of the guardian attendance alert;
 * - free enrollments (baseAmount 0) — nobody paid anything.
 */
function isReceiptWorthy(sale) {
    if (!sale || !sale.studentId) return false;
    if (!(Number(sale.baseAmount) > 0)) return false;
    if (sale.paymentMethod === 'attendance_mark') return false;
    if (sale.freeSession) return false;
    return true;
}

/**
 * Finalize a sale by id. `context` records who/what triggered settlement.
 * Returns { alreadyCompleted } — callers treat both outcomes as success.
 */
async function finalizeSale(saleId, context = {}) {
    const db = getFirestore();
    let alreadyCompleted = false;
    let settledSale = null;

    await db.runTransaction(async (tx) => {
        const saleRef = db.collection('sales').doc(saleId);
        const saleDoc = await tx.get(saleRef);
        if (!saleDoc.exists) throw new Error(`Sale ${saleId} not found`);
        const sale = saleDoc.data();

        if (sale.status === 'completed') {
            alreadyCompleted = true;
            return;
        }
        settledSale = sale;
        if (!['pending_gateway', 'pending_slip', 'hold'].includes(sale.status)) {
            throw new Error(`Sale ${saleId} is not settleable (status: ${sale.status})`);
        }

        // Commission from the teacher's CURRENT rate, snapshotted onto the sale.
        let teacherCommission = 0;
        let instituteIncome = sale.baseAmount || 0;
        let rateApplied = 0;
        let staffRef = null;
        if (sale.teacherId && sale.baseAmount > 0) {
            staffRef = db.collection('staff').doc(sale.teacherId);
            const staffDoc = await tx.get(staffRef);
            if (staffDoc.exists) {
                const split = splitCommission(sale.baseAmount, staffDoc.data().commissionRate);
                teacherCommission = split.teacherCommission;
                instituteIncome = split.instituteIncome;
                rateApplied = split.rate;
            }
        }

        // Student enrollment access.
        const enrollField = context.enrollField || sale.enrollField;
        if (enrollField && sale.studentId) {
            tx.update(db.collection('users').doc(sale.studentId), {
                [enrollField]: FieldValue.arrayUnion(String(sale.itemId)),
            });
        }

        tx.update(saleRef, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            teacherCommission,
            instituteIncome,
            commissionRateApplied: rateApplied,
            ...(context.gateway ? { gateway: context.gateway } : {}),
            ...(context.gatewayCaptureId ? { gatewayCaptureId: context.gatewayCaptureId } : {}),
            ...(context.settledBy ? { settledBy: context.settledBy } : {}),
        });

        if (staffRef && teacherCommission > 0) {
            tx.update(staffRef, { totalEarned: FieldValue.increment(teacherCommission) });
        }

        // Double-entry ledger row (LKR): cash in = revenue + teacher payable.
        if (sale.baseAmount > 0) {
            const ledgerRef = db.collection('financial_ledger').doc();
            tx.set(ledgerRef, {
                id: ledgerRef.id,
                orderId: saleId,
                type: 'sale',
                entries: [
                    { account: `cash_${context.gateway || sale.gateway || 'unknown'}`, amount: sale.baseAmount },
                    { account: 'revenue_institute', amount: -instituteIncome },
                    ...(teacherCommission > 0
                        ? [{ account: `payable_teacher_${sale.teacherId}`, amount: -teacherCommission }]
                        : []),
                ],
                currency: sale.currency,
                fxRate: sale.fxRate,
                metadata: { teacherId: sale.teacherId || null, studentId: sale.studentId, itemId: String(sale.itemId) },
                createdAt: new Date().toISOString(),
            });
        }
    });

    // Receipt — queued AFTER the transaction, and only when this call is the one that
    // actually settled the sale.
    //   * after: a transaction body can be retried, which would queue duplicates;
    //   * !alreadyCompleted: makes the receipt inherit finalizeSale's idempotency, so a
    //     replayed gateway webhook can't send a second receipt.
    // Never throws: a notification problem must not fail a payment that already settled.
    if (!alreadyCompleted && isReceiptWorthy(settledSale)) {
        try {
            const student = (await db.collection('users').doc(settledSale.studentId).get()).data() || {};
            await db.collection('notifications_outbox').add({
                type: 'payment_receipt',
                saleId,
                studentId: settledSale.studentId,
                studentName: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
                studentEmail: student.email || null,
                studentPhone: student.contactNumber || null,
                guardianEmail: student.guardianEmail || null,
                guardianPhone: student.guardianPhone || null,
                itemTitle: settledSale.itemName || settledSale.itemType || 'your enrollment',
                amount: settledSale.amount ?? settledSale.baseAmount,
                currency: settledSale.currency || 'LKR',
                method: context.gateway || settledSale.gateway || null,
                createdAt: new Date().toISOString(),
                status: 'queued',
            });
        } catch (e) {
            console.error(`finalizeSale: could not queue receipt for ${saleId}: ${e?.message}`);
        }
    }

    return { alreadyCompleted };
}

module.exports = { finalizeSale, splitCommission, isReceiptWorthy };
