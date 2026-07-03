/**
 * Minimal PayPal REST v2 client (no SDK — Node 22 global fetch).
 * Secrets: PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_ENV / PAYPAL_WEBHOOK_ID.
 */
const BASE_URLS = {
    sandbox: 'https://api-m.sandbox.paypal.com',
    live: 'https://api-m.paypal.com',
};

function baseUrl() {
    return BASE_URLS[process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox'];
}

let cachedToken = null; // { token, expiresAt }

async function getAccessToken() {
    if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) return cachedToken.token;
    const id = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    if (!id || !secret) throw new Error('PayPal credentials not configured');

    const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new Error(`PayPal token request failed: ${res.status}`);
    const data = await res.json();
    cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return cachedToken.token;
}

async function paypalFetch(path, { method = 'GET', body, headers = {} } = {}) {
    const token = await getAccessToken();
    const res = await fetch(`${baseUrl()}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = data?.details?.[0]?.issue || data?.message || res.status;
        const err = new Error(`PayPal ${method} ${path} failed: ${detail}`);
        err.paypal = data;
        throw err;
    }
    return data;
}

/** Verify a webhook signature via PayPal's verification endpoint. */
async function verifyWebhookSignature(headers, rawBody) {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) return false;
    const result = await paypalFetch('/v1/notifications/verify-webhook-signature', {
        method: 'POST',
        body: {
            auth_algo: headers['paypal-auth-algo'],
            cert_url: headers['paypal-cert-url'],
            transmission_id: headers['paypal-transmission-id'],
            transmission_sig: headers['paypal-transmission-sig'],
            transmission_time: headers['paypal-transmission-time'],
            webhook_id: webhookId,
            webhook_event: JSON.parse(rawBody),
        },
    });
    return result.verification_status === 'SUCCESS';
}

module.exports = { paypalFetch, verifyWebhookSignature, baseUrl };
