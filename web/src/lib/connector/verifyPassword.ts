import 'server-only';

/**
 * Verify an email + password against Firebase Auth via the Identity Toolkit REST API.
 * The Admin SDK cannot verify passwords, so this is the standard server-side technique
 * (the same one clazz.lk's /username-login uses). Honors the auth emulator host when set.
 * Returns the matched uid, or null on any failure — never throws.
 */
export async function verifyPassword(email: string, password: string): Promise<string | null> {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey || !email || !password) return null;

    const emuHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    const base = emuHost
        ? `http://${emuHost}/identitytoolkit.googleapis.com`
        : 'https://identitytoolkit.googleapis.com';

    try {
        const res = await fetch(`${base}/v1/accounts:signInWithPassword?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: false }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { localId?: string };
        return typeof data.localId === 'string' ? data.localId : null;
    } catch {
        return null;
    }
}
