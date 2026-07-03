/**
 * joinZoomClass — enrolled student gets a UNIQUE, approved Zoom join link.
 *
 * Security: each student registers with a unique email → a unique join_url that
 * can't be shared (manual-approval meeting, allow_multiple_devices off). Old
 * active sessions are invalidated so one student = one live join. The join_url is
 * cached in zoom_sessions to avoid Zoom's 3-adds-per-registrant-per-day limit.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { apiCall } = require('./client');
const { SECRETS } = require('./oauth');

const joinZoomClass = onCall({ secrets: SECRETS }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid || request.auth.token.role !== 'student') {
        throw new HttpsError('permission-denied', 'Student sign-in required');
    }
    const { classId, deviceHash } = request.data || {};
    if (!classId) throw new HttpsError('invalid-argument', 'classId required');

    const db = getFirestore();
    const [classDoc, studentDoc] = await Promise.all([
        db.doc(`classes/${classId}`).get(),
        db.doc(`users/${uid}`).get(),
    ]);
    if (!classDoc.exists) throw new HttpsError('not-found', 'Class not found');
    const cls = classDoc.data();
    const student = studentDoc.data() || {};

    const isFree = cls.pricing?.isFree || !(cls.pricing?.basePrice > 0);
    const enrolled = (student.enrolledClassIds || []).map(String).includes(String(classId));
    if (!isFree && !enrolled) throw new HttpsError('permission-denied', 'Enroll in this class to join.');

    // Per-month classes: access requires a completed sale covering the current month.
    if (!isFree && cls.weeklyPaymentOption === 'per_month') {
        const month = new Date().toISOString().slice(0, 7);
        const salesSnap = await db
            .collection('sales')
            .where('studentId', '==', uid)
            .where('itemId', '==', String(classId))
            .where('status', '==', 'completed')
            .get();
        const covered = salesSnap.docs.some((d) => d.data().coveredMonth === month);
        if (!covered) {
            throw new HttpsError('failed-precondition', `RENEW_REQUIRED: renew this class for ${month} to join.`);
        }
    }
    if (cls.meetProvider !== 'zoom' || !cls.zoomMeetingId) {
        throw new HttpsError('failed-precondition', 'This class has no Zoom meeting.');
    }

    const staffId = cls.teacherId;
    const meetingId = String(cls.zoomMeetingId);
    const registrantEmail =
        student.email && student.email.includes('@') ? student.email : `student+${uid}@ljeducare.lms`;
    const name = `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || 'Student';

    // Prior sessions for this student+class (reuse cache + invalidate old actives).
    const priorSnap = await db
        .collection('zoom_sessions')
        .where('studentId', '==', uid)
        .where('classId', '==', String(classId))
        .get();
    const cached = priorSnap.docs.map((d) => d.data()).find((s) => String(s.meetingId) === meetingId && s.joinUrl);

    const batch = db.batch();
    priorSnap.docs.forEach((d) => {
        if (d.data().status === 'active') batch.update(d.ref, { status: 'invalidated' });
    });
    await batch.commit();

    let joinUrl = cached?.joinUrl;
    if (!joinUrl) {
        // Register + approve so the manual-approval meeting lets them straight in.
        const reg = await apiCall(staffId, 'POST', `/meetings/${meetingId}/registrants`, {
            email: registrantEmail,
            first_name: name.split(' ')[0] || name,
            last_name: name.split(' ').slice(1).join(' ') || '-',
        });
        joinUrl = reg.join_url;
        try {
            await apiCall(staffId, 'PUT', `/meetings/${meetingId}/registrants/status`, {
                action: 'approve',
                registrants: [{ email: registrantEmail }],
            });
        } catch {
            /* approval best-effort; auto-approve meetings still return a usable link */
        }
        if (!joinUrl) {
            // Recover from the registrant list (manual-approval adds sometimes omit join_url).
            const list = await apiCall(staffId, 'GET', `/meetings/${meetingId}/registrants?status=approved&page_size=300`);
            joinUrl = (list.registrants || []).find((r) => r.email === registrantEmail)?.join_url;
        }
    }
    if (!joinUrl) throw new HttpsError('internal', 'Could not obtain a Zoom join link. Please try again.');

    const sessionRef = db.collection('zoom_sessions').doc();
    await sessionRef.set({
        id: sessionRef.id,
        studentId: uid,
        classId: String(classId),
        meetingId,
        joinUrl,
        deviceHash: deviceHash || null,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastJoinedAt: FieldValue.serverTimestamp(),
    });

    return { joinUrl };
});

module.exports = { joinZoomClass };
