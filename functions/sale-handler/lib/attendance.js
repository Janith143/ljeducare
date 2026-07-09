/**
 * markAttendance (callable) — kiosk/staff marks a student present for a class session.
 * Ported from the source kiosk flow, minus the Rs.5 platform fee (no platform).
 *
 * payment paths:
 *   'enrolled' — student already has access; mark only.
 *   'cash'     — fee collected at the front desk: records a completed cash sale
 *                through the SAME finalize path (commission split + ledger + enrollment).
 *   'unpaid'   — access granted on credit: zero-value 'attendance_mark' sale
 *                (single session only), mark flagged unpaid.
 * Idempotent: attendance doc id = classId_sessionDate_studentId.
 * Every mark queues a guardian alert in notifications_outbox (delivery = send-notification fn).
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { loadCurrencySettings } = require('./items');
const { resolvePrice, buildSaleSnapshot } = require('./money');
const { finalizeSale } = require('./finalize');
const { generateSaleId } = require('./enroll');

const MARKER_ROLES = ['kiosk', 'teacher', 'teacher_admin', 'manager', 'main_admin'];

const markAttendance = onCall(async (request) => {
    const role = request.auth?.token?.role;
    if (!request.auth?.uid || !MARKER_ROLES.includes(role)) {
        throw new HttpsError('permission-denied', 'Kiosk or staff sign-in required');
    }

    const { classId, studentId, sessionDate, payment = 'enrolled' } = request.data || {};
    if (!classId || !studentId) throw new HttpsError('invalid-argument', 'classId and studentId required');
    if (!['enrolled', 'cash', 'unpaid'].includes(payment)) {
        throw new HttpsError('invalid-argument', 'payment must be enrolled | cash | unpaid');
    }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(sessionDate || '')
        ? sessionDate
        : new Date().toISOString().slice(0, 10);

    const db = getFirestore();
    const classDoc = await db.collection('classes').doc(String(classId)).get();
    if (!classDoc.exists || classDoc.data().isDeleted) throw new HttpsError('not-found', 'Class not found');

    // Resolve the student by users doc-id (= uid, what the QR encodes) first, then by the
    // business studentId field (LJE####XX) so staff can type the human-facing id too.
    let studentDoc = await db.collection('users').doc(String(studentId)).get();
    if (!studentDoc.exists) {
        const byBizId = await db
            .collection('users')
            .where('studentId', '==', String(studentId).trim())
            .limit(1)
            .get();
        if (!byBizId.empty) studentDoc = byBizId.docs[0];
    }
    if (!studentDoc.exists || studentDoc.data().role !== 'student') {
        throw new HttpsError('not-found', 'Student not found — check the ID');
    }
    const cls = { ...classDoc.data(), id: classDoc.id };
    const student = { ...studentDoc.data(), id: studentDoc.id };

    // Idempotent per session.
    const attId = `${cls.id}_${date}_${student.id}`;
    const attRef = db.collection('attendance').doc(attId);
    if ((await attRef.get()).exists) {
        return { alreadyMarked: true, studentName: `${student.firstName} ${student.lastName}` };
    }

    const isEnrolled = (student.enrolledClassIds || []).map(String).includes(String(cls.id));
    let paymentStatus = 'paid';
    let saleId = null;

    if (payment === 'enrolled') {
        if (!isEnrolled) {
            throw new HttpsError(
                'failed-precondition',
                'NOT_ENROLLED: student has no active enrollment — collect cash or mark unpaid.',
            );
        }
    } else if (payment === 'cash') {
        const settings = await loadCurrencySettings();
        const price = resolvePrice(cls.pricing || { basePrice: 0, isFree: true }, settings.base, settings);
        saleId = generateSaleId();
        await db.collection('sales').doc(saleId).set({
            id: saleId,
            studentId: student.id,
            teacherId: cls.teacherId || null,
            itemId: String(cls.id),
            itemType: 'class',
            itemName: cls.title,
            enrollField: 'enrolledClassIds',
            saleDate: new Date().toISOString(),
            ...(price.amount > 0
                ? buildSaleSnapshot(price, settings)
                : { currency: settings.base, amount: 0, baseAmount: 0, fxRate: 1 }),
            status: 'pending_gateway', // settled immediately below
            gateway: 'manual',
            paymentMethod: 'manual_at_venue',
            cashAtVenue: true,
            studentSnapshot: {
                name: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
                studentId: student.id,
                contactNumber: student.contactNumber ?? '',
            },
        });
        await finalizeSale(saleId, { gateway: 'manual', settledBy: `attendance:${request.auth.uid}` });
        paymentStatus = 'paid_at_venue';
    } else {
        // unpaid — single-session access grant (ported ATT- pattern, no fee)
        saleId = `ATT-${generateSaleId()}`;
        await db.collection('sales').doc(saleId).set({
            id: saleId,
            studentId: student.id,
            teacherId: cls.teacherId || null,
            itemId: String(cls.id),
            itemType: 'class',
            itemName: cls.title,
            enrollField: 'enrolledClassIds',
            saleDate: new Date().toISOString(),
            currency: 'LKR',
            amount: 0,
            baseAmount: 0,
            fxRate: 1,
            status: 'pending_gateway',
            gateway: 'manual',
            paymentMethod: 'attendance_mark',
            freeSession: true,
        });
        await finalizeSale(saleId, { gateway: 'manual', settledBy: `attendance:${request.auth.uid}` });
        paymentStatus = 'unpaid';
    }

    await attRef.set({
        id: attId,
        classId: String(cls.id),
        classTitle: cls.title,
        sessionDate: date,
        studentId: student.id,
        studentName: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
        studentAvatar: student.avatar || '',
        teacherId: cls.teacherId || null,
        attendedAt: new Date().toISOString(),
        paymentStatus,
        ...(saleId ? { paymentRef: saleId } : {}),
        markedBy: request.auth.uid,
    });

    // Guardian alert → outbox (send-notification fn delivers via SMS/email).
    if (student.guardianPhone || student.guardianEmail) {
        await db.collection('notifications_outbox').add({
            type: 'guardian_attendance_alert',
            studentId: student.id,
            studentName: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
            guardianPhone: student.guardianPhone || null,
            guardianEmail: student.guardianEmail || null,
            classTitle: cls.title,
            sessionDate: date,
            paymentStatus,
            createdAt: new Date().toISOString(),
            status: 'queued',
        });
    }

    return {
        success: true,
        studentName: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
        paymentStatus,
        wasEnrolled: isEnrolled,
    };
});

/** Roster for a class session (kiosk feed + admin reports). */
const getSessionAttendance = onCall(async (request) => {
    const role = request.auth?.token?.role;
    if (!request.auth?.uid || !MARKER_ROLES.includes(role)) {
        throw new HttpsError('permission-denied', 'Kiosk or staff sign-in required');
    }
    const { classId, sessionDate } = request.data || {};
    if (!classId) throw new HttpsError('invalid-argument', 'classId required');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(sessionDate || '')
        ? sessionDate
        : new Date().toISOString().slice(0, 10);

    const snap = await getFirestore()
        .collection('attendance')
        .where('classId', '==', String(classId))
        .where('sessionDate', '==', date)
        .get();
    return {
        records: snap.docs
            .map((d) => d.data())
            .sort((a, b) => b.attendedAt.localeCompare(a.attendedAt)),
    };
});

module.exports = { markAttendance, getSessionAttendance };
