/**
 * Fan one message out across the channels an event is allowed to use.
 *
 * Shared by every sender (outbox trigger, class-reminder scheduler, teacher
 * broadcast) so channel gating, in-app writes and result shaping live in ONE place.
 */
const { getFirestore } = require('firebase-admin/firestore');
const { sendSms, sendEmail, SITE_NAME } = require('./channels');

/**
 * @param recipients [{ uid?, name?, email?, phone? }]
 * @param channels   { inApp, email, sms } — already resolved from settings
 * @returns { counts, results } — results[] is per recipient/channel, honest about ok
 */
async function deliverToRecipients(recipients, channels, { title, body, link, smsText }) {
    const db = getFirestore();
    const counts = { recipients: recipients.length, inApp: 0, email: 0, sms: 0 };
    const results = [];
    const now = new Date().toISOString();

    // In-app: batched, one doc per recipient that has an account.
    if (channels.inApp) {
        const withUid = recipients.filter((r) => r.uid);
        for (let i = 0; i < withUid.length; i += 400) {
            const batch = db.batch();
            withUid.slice(i, i + 400).forEach((r) => {
                const ref = db.collection('notifications').doc();
                batch.set(ref, {
                    id: ref.id,
                    recipientId: r.uid,
                    title: String(title).slice(0, 140),
                    body: String(body).slice(0, 1000),
                    link: link ? String(link).slice(0, 300) : null,
                    read: false,
                    createdAt: now,
                });
            });
            await batch.commit();
            counts.inApp += Math.min(400, withUid.length - i);
        }
    }

    // Email + SMS per recipient. Never throw: one bad address must not stop the rest.
    for (const r of recipients) {
        if (channels.email && r.email) {
            const res = await sendEmail(
                r.email,
                title,
                `<p>${body}</p>${link ? `<p><a href="${link}">${link}</a></p>` : ''}` +
                    `<p style="color:#94a3b8;font-size:12px">${SITE_NAME}</p>`,
            ).catch((e) => ({ ok: false, reason: e?.message }));
            if (res?.ok) counts.email++;
            results.push({ to: r.email, channel: 'email', ...res });
        }
        if (channels.sms && r.phone) {
            const res = await sendSms(r.phone, smsText || `${SITE_NAME}: ${title} — ${body}`).catch((e) => ({
                ok: false,
                reason: e?.message,
            }));
            if (res?.ok) counts.sms++;
            results.push({ to: r.phone, channel: 'sms', ...res });
        }
    }

    return { counts, results };
}

/**
 * Turn per-channel results into an honest status.
 * `sent_dev` means credentials aren't configured, so nothing actually left the box.
 */
function statusFrom(results) {
    const attempted = results.filter(Boolean);
    if (attempted.length === 0) return 'skipped';
    if (attempted.every((r) => r.dev)) return 'sent_dev';
    const ok = attempted.filter((r) => r.ok);
    if (ok.length === 0) return 'failed';
    return ok.length < attempted.length ? 'partial' : 'sent';
}

module.exports = { deliverToRecipients, statusFrom };
