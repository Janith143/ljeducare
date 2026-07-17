/**
 * send-notification — LJ Educare
 * Region: asia-south1   Database: (default)
 *
 * deliverOutboxMessage: Firestore trigger on notifications_outbox/{id}.
 * Currently handles guardian_attendance_alert (SMS + email to the guardian).
 * The outbox pattern keeps senders (sale-handler etc.) decoupled from delivery.
 */
const { setGlobalOptions } = require('firebase-functions/v2');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { sendSms, sendEmail, SITE_NAME } = require('./lib/channels');

setGlobalOptions({ region: 'asia-south1' });
if (!admin.apps.length) admin.initializeApp();

exports.deliverOutboxMessage = onDocumentCreated(
    {
        document: 'notifications_outbox/{id}',
        secrets: ['NOTIFYLK_USER_ID', 'NOTIFYLK_API_KEY', 'NOTIFYLK_SENDER_ID', 'SMTP_EMAIL_USER', 'SMTP_EMAIL_PASS'],
    },
    async (event) => {
        const doc = event.data;
        if (!doc) return;
        const msg = doc.data();
        if (msg.status !== 'queued') return;

        const results = {};
        try {
            if (msg.type === 'guardian_attendance_alert') {
                const paidText =
                    msg.paymentStatus === 'paid_at_venue'
                        ? ' Fee was collected in cash at the institute.'
                        : msg.paymentStatus === 'unpaid'
                          ? ' Note: the class fee is still DUE.'
                          : '';
                const text = `${SITE_NAME}: ${msg.studentName} attended "${msg.classTitle}" on ${msg.sessionDate}.${paidText}`;

                if (msg.guardianPhone) results.sms = await sendSms(msg.guardianPhone, text);
                if (msg.guardianEmail) {
                    results.email = await sendEmail(
                        msg.guardianEmail,
                        `Attendance: ${msg.studentName} — ${msg.classTitle}`,
                        `<p>${text}</p><p style="color:#64748b;font-size:12px">Automated notification from ${SITE_NAME}.</p>`,
                    );
                }
            } else {
                logger.warn(`deliverOutboxMessage: unknown type ${msg.type}`);
            }

            // Status must reflect what actually happened. This used to be
            // `dev ? 'sent_dev' : 'sent'` without ever checking results.*.ok, so a
            // message the gateway rejected was still recorded as delivered.
            const attempted = [results.sms, results.email].filter(Boolean);
            const delivered = attempted.filter((r) => r.ok);
            const dev = attempted.length > 0 && attempted.every((r) => r.dev);
            const status =
                attempted.length === 0
                    ? 'skipped' // no guardian phone or email on the record
                    : dev
                      ? 'sent_dev' // credentials not configured — logged, not sent
                      : delivered.length === 0
                        ? 'failed'
                        : delivered.length < attempted.length
                          ? 'partial'
                          : 'sent';
            await doc.ref.update({
                status,
                results,
                deliveredAt: new Date().toISOString(),
            });
        } catch (e) {
            logger.error('deliverOutboxMessage failed', e?.message);
            await doc.ref.update({ status: 'failed', error: e?.message || 'unknown' });
        }
    },
);

const { sendBulkMessage } = require("./lib/bulk");
exports.sendBulkMessage = sendBulkMessage;
