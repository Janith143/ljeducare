/**
 * Delivery channels — SMS via Notify.lk, email via SMTP (Nodemailer).
 * Ported from the source send-notification with brand constants swapped.
 * Without configured secrets (local dev), messages are logged and marked sent_dev.
 */
const { logger } = require('firebase-functions');

const SITE_NAME = process.env.PUBLIC_SITE_NAME || 'LJ Educare';

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
    if (!userId || !apiKey || !senderId) {
        logger.info(`[DEV SMS → ${to}] ${message}`);
        return { ok: true, dev: true };
    }
    const params = new URLSearchParams({ user_id: userId, api_key: apiKey, sender_id: senderId, to, message });
    const res = await fetch(`https://app.notify.lk/api/v1/send?${params}`);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.status === 'success', reason: data?.data || undefined };
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
    if (!process.env.SMTP_EMAIL_USER || !process.env.SMTP_EMAIL_PASS) {
        logger.info(`[DEV EMAIL → ${to}] ${subject}`);
        return { ok: true, dev: true };
    }
    const transporter = await getTransporter();
    await transporter.sendMail({
        from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL_USER}>`,
        to,
        subject,
        html,
    });
    return { ok: true };
}

module.exports = { sendSms, sendEmail, SITE_NAME };
