/**
 * Minimal OnePay REST v3 client (no SDK — Node 22 global fetch).
 * Secrets: ONEPAY_APP_ID / ONEPAY_APP_TOKEN / ONEPAY_HASH_SALT.
 *
 * Ground truth for the pieces OnePay's own docs (docs.onepay.lk) leave vague or
 * get wrong was pulled from OnePay's official PHP SDK source
 * (github.com/onepay-srilanka/php-checkout-sdk — OnePayClient.php + HttpClient.php):
 *   - Authorization header carries the RAW app_token, no "Bearer " prefix.
 *   - The create-checkout response nests the redirect URL at data.gateway.redirect_url,
 *     not top-level as the docs prose implies.
 * Both SDKs are explicitly scoped to "checkout link creation only" — the status-check
 * response shape and the callback payload are taken from docs prose alone and parsed
 * defensively here; confirm against a real sandbox response before relying on them
 * (see plan verification step A).
 */
const crypto = require('crypto');

function baseUrl() {
    return process.env.ONEPAY_BASE_URL || 'https://api.onepay.lk';
}

/** SHA256(app_id + currency + amount + hash_salt), lowercase hex, no delimiters. `amount` must already be a 2dp string, e.g. "100.00". */
function generateHash(currency, amount) {
    const appId = process.env.ONEPAY_APP_ID;
    const hashSalt = process.env.ONEPAY_HASH_SALT;
    if (!appId || !hashSalt) throw new Error('OnePay credentials not configured');
    return crypto.createHash('sha256').update(`${appId}${currency}${amount}${hashSalt}`).digest('hex');
}

/**
 * Sri Lanka local (0771234567) -> E.164 (+94771234567). Passes through anything already
 * starting with '+'; also handles a country code with no '+' and a bare 9-digit number
 * with neither — always returns a '+'-prefixed string rather than risk silently sending
 * OnePay a bare local number (guaranteed to fail their E.164 expectation).
 */
function toE164LK(phone) {
    const raw = String(phone || '').trim();
    if (raw.startsWith('+')) return raw;
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 10) return `+94${digits.slice(1)}`; // 0771234567
    if (digits.startsWith('94') && digits.length === 11) return `+${digits}`; // 94771234567
    if (digits.length === 9) return `+94${digits}`; // 771234567
    return digits ? `+${digits}` : raw;
}

async function onepayFetch(path, { method = 'POST', body } = {}) {
    const appToken = process.env.ONEPAY_APP_TOKEN;
    if (!appToken) throw new Error('OnePay credentials not configured');

    const res = await fetch(`${baseUrl()}${path}`, {
        method,
        headers: {
            Authorization: appToken, // raw token — no "Bearer " prefix (confirmed in HttpClient.php)
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = data?.error || data?.message || res.status;
        const err = new Error(`OnePay ${method} ${path} failed: ${detail}`);
        err.onepay = data;
        err.status = res.status;
        throw err;
    }
    return data;
}

module.exports = { onepayFetch, generateHash, toE164LK, baseUrl };
