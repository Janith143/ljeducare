/**
 * send-notification — LJ Educare
 * Region: asia-south1   Database: (default)
 *
 * deliverOutboxMessage — Firestore trigger on notifications_outbox/{id}. Handles:
 *   guardian_attendance_alert  a student was marked present (guardian)
 *   payment_receipt            a sale settled (student + guardian)
 *   class_reminder             a session starts soon / now (enrolled students)
 * The outbox keeps senders (sale-handler, the scheduler) decoupled from delivery,
 * and each message carries its own honest status.
 *
 * classReminderTick — every 5 min, queues reminders for sessions about to start.
 * sendBulkMessage / sendTeacherMessage — admin and teacher broadcasts.
 */
const { setGlobalOptions } = require('firebase-functions/v2');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { SITE_NAME } = require('./lib/channels');
const { deliverToRecipients, statusFrom } = require('./lib/deliver');
const { getNotificationSettings, channelsFor } = require('./lib/settings');

setGlobalOptions({ region: 'asia-south1' });
if (!admin.apps.length) admin.initializeApp();

const SECRETS = ['NOTIFYLK_USER_ID', 'NOTIFYLK_API_KEY', 'NOTIFYLK_SENDER_ID', 'SMTP_EMAIL_USER', 'SMTP_EMAIL_PASS'];

/** Build the recipients + copy for one outbox message. Returns null for unknown types. */
function renderMessage(msg) {
    switch (msg.type) {
        case 'guardian_attendance_alert': {
            const paidText =
                msg.paymentStatus === 'paid_at_venue'
                    ? ' Fee was collected in cash at the institute.'
                    : msg.paymentStatus === 'unpaid'
                      ? ' Note: the class fee is still DUE.'
                      : '';
            const body = `${msg.studentName} attended "${msg.classTitle}" on ${msg.sessionDate}.${paidText}`;
            return {
                event: 'guardianAttendance',
                title: `Attendance: ${msg.studentName} — ${msg.classTitle}`,
                body,
                smsText: `${SITE_NAME}: ${body}`,
                // The guardian has no account, so there is no in-app recipient here.
                recipients: [{ name: 'Guardian', email: msg.guardianEmail || null, phone: msg.guardianPhone || null }],
            };
        }

        case 'payment_receipt': {
            const body =
                `Payment received: ${msg.currency} ${msg.amount} for "${msg.itemTitle}". ` +
                `Receipt ${msg.saleId}.${msg.method ? ` Paid via ${msg.method}.` : ''}`;
            const recipients = [
                { uid: msg.studentId, name: msg.studentName, email: msg.studentEmail || null, phone: msg.studentPhone || null },
            ];
            // Guardian gets a copy when one is on file — usually the person paying.
            if (msg.guardianEmail || msg.guardianPhone) {
                recipients.push({ name: 'Guardian', email: msg.guardianEmail || null, phone: msg.guardianPhone || null });
            }
            return {
                event: 'payment',
                title: `Payment received — ${msg.itemTitle}`,
                body,
                smsText: `${SITE_NAME}: ${body}`,
                recipients,
            };
        }

        case 'class_reminder': {
            const starting = msg.kind === 'start';
            const body = starting
                ? `"${msg.classTitle}" is starting now (${msg.startTime}).`
                : `"${msg.classTitle}" starts at ${msg.startTime} — in ${msg.leadMinutes} minutes.`;
            return {
                event: 'classReminder',
                title: starting ? `Starting now: ${msg.classTitle}` : `Reminder: ${msg.classTitle}`,
                body,
                link: msg.link || null,
                smsText: `${SITE_NAME}: ${body}${msg.link ? ` Join: ${msg.link}` : ''}`,
                recipients: msg.recipients || [],
            };
        }

        default:
            return null;
    }
}

exports.deliverOutboxMessage = onDocumentCreated(
    { document: 'notifications_outbox/{id}', secrets: SECRETS },
    async (event) => {
        const doc = event.data;
        if (!doc) return;
        const msg = doc.data();
        if (msg.status !== 'queued') return;

        try {
            const rendered = renderMessage(msg);
            if (!rendered) {
                logger.warn(`deliverOutboxMessage: unknown type ${msg.type}`);
                await doc.ref.update({ status: 'failed', error: `unknown type ${msg.type}` });
                return;
            }

            const settings = await getNotificationSettings();
            const channels = channelsFor(settings, rendered.event);
            const recipients = rendered.recipients.filter((r) => r && (r.uid || r.email || r.phone));

            const { counts, results } = await deliverToRecipients(recipients, channels, rendered);

            await doc.ref.update({
                // Honest status: derived from what each channel actually returned, never
                // assumed. `skipped` covers "no usable contact" and "all channels off".
                status: statusFrom(results),
                counts,
                results: results.slice(0, 50), // cap: a class reminder can have many recipients
                channels,
                deliveredAt: new Date().toISOString(),
            });
        } catch (e) {
            logger.error('deliverOutboxMessage failed', e?.message);
            await doc.ref.update({ status: 'failed', error: e?.message || 'unknown' });
        }
    },
);

const { sendBulkMessage } = require('./lib/bulk');
const { sendTeacherMessage } = require('./lib/teacherMessage');
const { classReminderTick } = require('./lib/classReminder');

exports.sendBulkMessage = sendBulkMessage;
exports.sendTeacherMessage = sendTeacherMessage;
exports.classReminderTick = classReminderTick;
