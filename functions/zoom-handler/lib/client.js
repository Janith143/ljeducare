/**
 * Zoom REST client — OAuth token exchange/refresh + authenticated API calls
 * with automatic refresh-on-401. Uses Node 22 global fetch (no axios).
 */
const { getFirestore } = require('firebase-admin/firestore');
const { getSecrets, writeTokens, getCredentials } = require('./store');

const ZOOM_OAUTH = 'https://zoom.us/oauth';
const ZOOM_API = 'https://api.zoom.us/v2';

function basicAuth(id, secret) {
    return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
}

/** Exchange an authorization code (or refresh token) for tokens. */
async function tokenRequest(staffId, params) {
    const { clientId, clientSecret } = await getCredentials(staffId);
    const res = await fetch(`${ZOOM_OAUTH}/token?${new URLSearchParams(params)}`, {
        method: 'POST',
        headers: { Authorization: basicAuth(clientId, clientSecret), 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Zoom token request failed: ${data.reason || res.status}`);
    return data;
}

async function refreshToken(staffId) {
    const { zoomRefreshToken } = await getSecrets(staffId);
    if (!zoomRefreshToken) throw new Error('Teacher has not connected Zoom.');
    const data = await tokenRequest(staffId, { grant_type: 'refresh_token', refresh_token: zoomRefreshToken });
    const tokens = { zoomAccessToken: data.access_token };
    if (data.refresh_token) tokens.zoomRefreshToken = data.refresh_token;
    await writeTokens(staffId, tokens);
    return data.access_token;
}

/** Authenticated Zoom API call for a staff host; refreshes + retries once on 401. */
async function apiCall(staffId, method, path, body) {
    let token = (await getSecrets(staffId)).zoomAccessToken;
    const call = async (t) => {
        const res = await fetch(`${ZOOM_API}${path}`, {
            method,
            headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
        return { status: res.status, ok: res.ok, data };
    };

    let r = await call(token);
    if (r.status === 401) {
        token = await refreshToken(staffId);
        r = await call(token);
    }
    if (!r.ok) {
        const err = new Error(`Zoom ${method} ${path} failed: ${r.data?.message || r.status}`);
        err.zoom = r.data;
        throw err;
    }
    return r.data;
}

/** Exchange the OAuth code on callback + persist tokens + Zoom user profile. */
async function completeOAuth(staffId, code, redirectUri) {
    const data = await tokenRequest(staffId, { grant_type: 'authorization_code', code, redirect_uri: redirectUri });
    await writeTokens(staffId, { zoomAccessToken: data.access_token, zoomRefreshToken: data.refresh_token });
    // Read the Zoom user profile for display + hosting.
    const me = await apiCall(staffId, 'GET', '/users/me');
    await getFirestore().doc(`staff/${staffId}`).set(
        { zoomAccountConnected: true, zoomUserId: me.id, zoomEmail: me.email },
        { merge: true },
    );
    return me;
}

module.exports = { tokenRequest, refreshToken, apiCall, completeOAuth, ZOOM_OAUTH, ZOOM_API };
