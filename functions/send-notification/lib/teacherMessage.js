/**
 * sendTeacherMessage (callable) — a teacher messages THEIR OWN enrolled students.
 *
 * The scoping is the security boundary: recipients are derived server-side from the
 * classes this teacher owns. A teacher can never address the whole student body, and
 * passing someone else's classId resolves to nothing rather than leaking it.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { deliverToRecipients } = require('./deliver');
const { getNotificationSettings, channelsFor } = require('./settings');
const { SITE_NAME } = require('./channels');

/**
 * The teacher's staff-doc id.
 *
 * classes.teacherId holds the STAFF doc id, not the auth uid — resolve it the same
 * way the web app does (lib/data/teacher.ts): the `tid` claim first, else the staff
 * doc whose userId matches. Querying classes by uid finds nothing.
 */
async function staffIdFor(db, uid, tid) {
    if (tid) {
        const doc = await db.collection('staff').doc(String(tid)).get();
        if (doc.exists) return doc.id;
    }
    const snap = await db.collection('staff').where('userId', '==', uid).limit(1).get();
    return snap.empty ? null : snap.docs[0].id;
}

/** Classes this teacher may message. Mirrors listTeacherClasses: own for teachers, all for teacher_admin. */
async function ownedClassIds(db, staffId, role) {
    const query =
        role === 'teacher_admin'
            ? db.collection('classes')
            : db.collection('classes').where('teacherId', '==', staffId ?? '__none__');
    const snap = await query.get();
    return snap.docs.filter((d) => !d.data().isDeleted).map((d) => d.id);
}

const sendTeacherMessage = onCall(
    { secrets: ['NOTIFYLK_USER_ID', 'NOTIFYLK_API_KEY', 'NOTIFYLK_SENDER_ID', 'SMTP_EMAIL_USER', 'SMTP_EMAIL_PASS'] },
    async (request) => {
        const uid = request.auth?.uid;
        const role = request.auth?.token?.role;
        if (!uid || !['teacher', 'teacher_admin'].includes(role)) {
            throw new HttpsError('permission-denied', 'Teachers only.');
        }

        const { classId = 'all', title, body, link, channels: wanted = {} } = request.data || {};
        if (!title || !body) throw new HttpsError('invalid-argument', 'title and body are required');

        const db = getFirestore();
        const staffId = await staffIdFor(db, uid, request.auth?.token?.tid);
        if (!staffId && role !== 'teacher_admin') {
            throw new HttpsError('failed-precondition', 'No teacher profile is linked to this account.');
        }
        const myClassIds = await ownedClassIds(db, staffId, role);
        if (myClassIds.length === 0) {
            return { recipients: 0, inApp: 0, email: 0, sms: 0, note: 'You have no classes yet.' };
        }

        // Only ever this teacher's classes — an unowned classId lands here as "not mine".
        const targetIds = classId === 'all' ? myClassIds : myClassIds.filter((id) => id === String(classId));
        if (targetIds.length === 0) throw new HttpsError('permission-denied', 'That class is not yours.');

        // Fan out over classes; Firestore array-contains-any caps at 30 values.
        const byUid = new Map();
        for (let i = 0; i < targetIds.length; i += 30) {
            const snap = await db
                .collection('users')
                .where('role', '==', 'student')
                .where('enrolledClassIds', 'array-contains-any', targetIds.slice(i, i + 30))
                .get();
            snap.docs.forEach((d) => {
                const u = d.data();
                if (u.isDeleted) return;
                byUid.set(d.id, {
                    uid: d.id,
                    name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
                    email: u.email || null,
                    phone: u.contactNumber || null,
                });
            });
        }
        const recipients = [...byUid.values()];
        if (recipients.length === 0) return { recipients: 0, inApp: 0, email: 0, sms: 0, note: 'No enrolled students.' };

        // A teacher may only use channels the admin has enabled for teacher messages —
        // SMS costs institute money, so the settings toggle is the ceiling, not the
        // teacher's checkbox.
        const settings = await getNotificationSettings();
        const allowed = channelsFor(settings, 'teacherMessage');
        const channels = {
            inApp: allowed.inApp && wanted.inApp !== false,
            email: allowed.email && wanted.email === true,
            sms: allowed.sms && wanted.sms === true,
        };

        const { counts } = await deliverToRecipients(recipients, channels, {
            title: `${title}`,
            body,
            link,
            smsText: `${SITE_NAME}: ${title} — ${body}`,
        });

        return {
            ...counts,
            blocked: {
                // Tell the teacher WHY a ticked channel sent nothing, instead of
                // silently reporting 0.
                email: wanted.email === true && !allowed.email,
                sms: wanted.sms === true && !allowed.sms,
            },
        };
    },
);

module.exports = { sendTeacherMessage };
