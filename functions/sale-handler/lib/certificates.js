/**
 * issueCertificate (callable) — issue a course-completion certificate.
 * Teachers may issue for their OWN courses; admins with the 'certificates'
 * permission for any. Public verification via the verificationId at /verify/[id].
 * Idempotent per (studentId, courseId).
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');

function makeVerificationId() {
    // LJC-XXXX-XXXX (unambiguous alphabet)
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const pick = (n) =>
        Array.from({ length: n }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
    return `LJC-${pick(4)}-${pick(4)}`;
}

const issueCertificate = onCall(async (request) => {
    const uid = request.auth?.uid;
    const role = request.auth?.token?.role;
    const perms = request.auth?.token?.perms || [];
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');

    const isAdmin =
        role === 'main_admin' ||
        (['manager', 'teacher_admin'].includes(role) && perms.includes('certificates'));
    const isTeacher = role === 'teacher' || role === 'teacher_admin';
    if (!isAdmin && !isTeacher) throw new HttpsError('permission-denied', 'Not allowed');

    const { studentId, courseId, note } = request.data || {};
    if (!studentId || !courseId) throw new HttpsError('invalid-argument', 'studentId and courseId required');

    const db = getFirestore();
    const [studentDoc, courseDoc] = await Promise.all([
        db.collection('users').doc(String(studentId)).get(),
        db.collection('courses').doc(String(courseId)).get(),
    ]);
    if (!studentDoc.exists || studentDoc.data().role !== 'student') {
        throw new HttpsError('not-found', 'Student not found');
    }
    if (!courseDoc.exists || courseDoc.data().isDeleted) {
        throw new HttpsError('not-found', 'Course not found');
    }
    const student = studentDoc.data();
    const course = courseDoc.data();

    // Teachers (non-admin) only for their own courses.
    if (!isAdmin) {
        const tid = request.auth.token.tid;
        let staffId = tid;
        if (!staffId) {
            const staffSnap = await db.collection('staff').where('userId', '==', uid).limit(1).get();
            staffId = staffSnap.empty ? null : staffSnap.docs[0].id;
        }
        if (!staffId || course.teacherId !== staffId) {
            throw new HttpsError('permission-denied', 'You can only issue certificates for your own courses');
        }
    }

    if (!(student.enrolledCourseIds || []).map(String).includes(String(courseId))) {
        throw new HttpsError('failed-precondition', 'Student is not enrolled in this course');
    }

    // Idempotent: one certificate per (student, course).
    const certId = `${courseId}_${studentId}`;
    const certRef = db.collection('certificates').doc(certId);
    const existing = await certRef.get();
    if (existing.exists) {
        return { alreadyIssued: true, verificationId: existing.data().verificationId };
    }

    let teacherName = '';
    if (course.teacherId) {
        const staffDoc = await db.collection('staff').doc(course.teacherId).get();
        teacherName = staffDoc.exists ? staffDoc.data().name : '';
    }

    const verificationId = makeVerificationId();
    await certRef.set({
        id: certId,
        studentId: String(studentId),
        studentName: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
        teacherId: course.teacherId || null,
        teacherName,
        itemId: String(courseId),
        itemType: 'course',
        itemTitle: course.title || '',
        issuedAt: new Date().toISOString(),
        issuedBy: uid,
        pdfUrl: '',
        verificationId,
        ...(note ? { note: String(note).slice(0, 300) } : {}),
    });

    return { success: true, verificationId };
});

module.exports = { issueCertificate };
