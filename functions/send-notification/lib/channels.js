/**
 * Delivery channels — SMS via Notify.lk, email via SMTP (Nodemailer).
 * Ported from the source send-notification with brand constants swapped.
 * Without configured secrets (local dev), messages are logged and marked sent_dev.
 */
const { logger } = require('firebase-functions');

const SITE_NAME = process.env.PUBLIC_SITE_NAME || 'LJ Educare';

/**
 * Is a credential actually usable?
 *
 * Not just "is it set": the secrets ship seeded with the literal string
 * REPLACE_ME, which is truthy. A plain `!value` check therefore treated an
 * unconfigured install as configured, so instead of logging in dev mode it
 * called the real API with junk credentials and every send failed.
 */
function configured(value) {
    const v = (value || '').trim();
    return v !== '' && v !== 'REPLACE_ME' && v !== 'CHANGE_ME';
}

/** Normalize an LK mobile number to 94XXXXXXXXX (Notify.lk format). */
function normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (/^0\d{9}$/.test(digits)) return `94${digits.slice(1)}`;
    if (/^94\d{9}$/.test(digits)) return digits;
    if (/^\d{9}$/.test(digits)) return `94${digits}`;
    return null;
}

async function sendSms(phone, message) {
    const userId = process.env.NOTIFYLK_USER_ID;
    const apiKey = process.env.NOTIFYLK_API_KEY;
    const senderId = process.env.NOTIFYLK_SENDER_ID;
    const to = normalizePhone(phone);
    if (!to) return { ok: false, reason: 'invalid_phone' };
    if (!configured(userId) || !configured(apiKey) || !configured(senderId)) {
        logger.info(`[DEV SMS → ${to}] ${message}`);
        return { ok: true, dev: true };
    }
    const params = new URLSearchParams({ user_id: userId, api_key: apiKey, sender_id: senderId, to, message });
    try {
        const res = await fetch(`https://app.notify.lk/api/v1/send?${params}`);
        const data = await res.json().catch(() => ({}));
        const ok = res.ok && data.status === 'success';
        // Surface WHY it failed — Notify.lk answers 200 with status:"error" for a bad
        // key, an unapproved sender id, or (on the demo tier) a number that isn't
        // registered on the account. Without this the reason is invisible.
        if (!ok) logger.warn(`SMS to ${to} rejected: ${JSON.stringify(data).slice(0, 300)}`);
        return { ok, reason: data?.message || data?.data || `http_${res.status}` };
    } catch (e) {
        logger.error(`SMS to ${to} threw: ${e?.message}`);
        return { ok: false, reason: e?.message || 'network_error' };
    }
}

let transporterPromise = null;
async function getTransporter() {
    if (!transporterPromise) {
        const nodemailer = require('nodemailer');
        transporterPromise = Promise.resolve(
            nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.SMTP_EMAIL_USER, pass: process.env.SMTP_EMAIL_PASS },
            }),
        );
    }
    return transporterPromise;
}

async function sendEmail(to, subject, html) {
    if (!configured(process.env.SMTP_EMAIL_USER) || !configured(process.env.SMTP_EMAIL_PASS)) {
        logger.info(`[DEV EMAIL → ${to}] ${subject}`);
        return { ok: true, dev: true };
    }
    // Never throw: a message with several channels must not lose the others because
    // one of them failed (an email error used to abort the whole outbox delivery).
    try {
        const transporter = await getTransporter();
        await transporter.sendMail({
            from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL_USER}>`,
            to,
            subject,
            html,
        });
        return { ok: true };
    } catch (e) {
        logger.error(`Email to ${to} failed: ${e?.message}`);
        return { ok: false, reason: e?.message || 'smtp_error' };
    }
}

// normalizePhone/configured are exported for the checks in scripts/check-sms.mjs.
module.exports = { sendSms, sendEmail, SITE_NAME, normalizePhone, configured };
