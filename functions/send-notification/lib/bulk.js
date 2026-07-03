/**
 * sendBulkMessage (callable) — admin broadcast to students across channels:
 * in-app notification, email, SMS, and FCM web/mobile push.
 * Requires the 'communications' permission (main_admin or delegated).
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { sendSms, sendEmail, SITE_NAME } = require('./channels');

function requireComms(request) {
    const role = request.auth?.token?.role;
    const perms = request.auth?.token?.perms || [];
    const ok = role === 'main_admin' || (['manager', 'teacher_admin'].includes(role) && perms.includes('communications'));
    if (!ok) throw new HttpsError('permission-denied', "Requires 'communications' permission");
    return request.auth.uid;
}

async function resolveRecipients(db, audience) {
    let q = db.collection('users').where('role', '==', 'student');
    if (audience && audience.startsWith('class:')) {
        q = q.where('enrolledClassIds', 'array-contains', audience.slice('class:'.length));
    }
    const snap = await q.get();
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

const sendBulkMessage = onCall(
    { secrets: ['NOTIFYLK_USER_ID', 'NOTIFYLK_API_KEY', 'NOTIFYLK_SENDER_ID', 'SMTP_EMAIL_USER', 'SMTP_EMAIL_PASS'] },
    async (request) => {
        const byUid = requireComms(request);
        const { audience = 'all_students', title, body, link, channels = {} } = request.data || {};
        if (!title || !body) throw new HttpsError('invalid-argument', 'title and body are required');

        const db = getFirestore();
        const recipients = await resolveRecipients(db, audience);
        const now = new Date().toISOString();
        const counts = { recipients: recipients.length, inApp: 0, email: 0, sms: 0, push: 0 };

        // In-app notification doc per recipient (default on).
        if (channels.inApp !== false) {
            for (let i = 0; i < recipients.length; i += 400) {
                const batch = db.batch();
                recipients.slice(i, i + 400).forEach((r) => {
                    const ref = db.collection('notifications').doc();
                    batch.set(ref, {
                        id: ref.id, recipientId: r.uid, title: String(title).slice(0, 140),
                        body: String(body).slice(0, 1000), link: link ? String(link).slice(0, 300) : null,
                        read: false, createdAt: now, sentBy: byUid,
                    });
                });
                await batch.commit();
                counts.inApp += Math.min(400, recipients.length - i);
            }
        }

        // Email / SMS.
        for (const r of recipients) {
            if (channels.email && r.email) {
                const res = await sendEmail(r.email, title, `<p>${body}</p>${link ? `<p><a href="${link}">${link}</a></p>` : ''}<p style="color:#94a3b8;font-size:12px">${SITE_NAME}</p>`).catch(() => null);
                if (res?.ok) counts.email++;
            }
            if (channels.sms && r.contactNumber) {
                const res = await sendSms(r.contactNumber, `${SITE_NAME}: ${title} — ${body}`).catch(() => null);
                if (res?.ok) counts.sms++;
            }
        }

        // FCM push to stored device tokens.
        if (channels.push) {
            const tokens = recipients.flatMap((r) => r.fcmTokens || []).filter(Boolean);
            for (let i = 0; i < tokens.length; i += 500) {
                try {
                    const res = await getMessaging().sendEachForMulticast({
                        tokens: tokens.slice(i, i + 500),
                        notification: { title, body },
                        ...(link ? { webpush: { fcmOptions: { link } } } : {}),
                    });
                    counts.push += res.successCount;
                } catch {
                    /* push best-effort */
                }
            }
        }

        return { success: true, ...counts };
    },
);

module.exports = { sendBulkMessage };
