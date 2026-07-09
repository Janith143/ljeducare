import { NextResponse } from 'next/server';
import { getSessionCustomToken, getUser } from '@/lib/auth/session';
import { adminAuth } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * Return a Firebase custom token for the current SESSION user so the client SDK can
 * sign in and match the cookie session. The app authenticates by session cookie, but
 * client-SDK operations (Storage uploads, callable Functions) need the client token to
 * carry the user's role/permission claims — this keeps them in sync.
 *
 * Prefer the token `next-firebase-auth-edge` already minted alongside the cookie
 * (enableCustomToken). Fall back to minting on demand so sessions created before that
 * flag was enabled still work without forcing a re-login.
 */
export async function GET() {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    try {
        const token = (await getSessionCustomToken()) ?? (await adminAuth().createCustomToken(user.uid));
        return NextResponse.json({ token });
    } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
