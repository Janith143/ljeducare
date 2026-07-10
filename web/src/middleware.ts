import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from 'next-firebase-auth-edge';
import { isRole } from '@ljeducare/shared';
import { AUTH_PATHS, authConfig } from '@/lib/auth/config';
import { requiredRolesFor, roleHomePath } from '@/lib/auth/paths';

export async function middleware(request: NextRequest) {
    return authMiddleware(request, {
        loginPath: AUTH_PATHS.login,
        logoutPath: AUTH_PATHS.logout,
        refreshTokenPath: AUTH_PATHS.refresh,
        ...authConfig,

        handleValidToken: async ({ decodedToken }, headers) => {
            const { pathname, search } = request.nextUrl;
            const required = requiredRolesFor(pathname);
            const role = isRole(decodedToken.role) ? decodedToken.role : undefined;

            // A valid token with no recognized role = a just-provisioned account whose
            // role claim hasn't propagated yet (syncRoleClaims runs after the users doc
            // write). Never trap it: let it reach /login|/register so the user can act,
            // and send it to /login from protected areas — otherwise the account bounces
            // between its dashboard and home until the cookie is cleared.
            if (!role) {
                if (required) {
                    const login = new URL('/login', request.url);
                    login.searchParams.set('next', pathname + search);
                    return NextResponse.redirect(login);
                }
                return NextResponse.next({ request: { headers } });
            }

            if (required && !required.includes(role)) {
                // Signed in but wrong area — send them to their own home.
                return NextResponse.redirect(new URL(roleHomePath(role), request.url));
            }
            // Signed-in users hitting /login or /register go to their dashboard.
            if (pathname === '/login' || pathname === '/register') {
                return NextResponse.redirect(new URL(roleHomePath(role), request.url));
            }
            return NextResponse.next({ request: { headers } });
        },

        handleInvalidToken: async () => {
            const { pathname, search } = request.nextUrl;
            if (requiredRolesFor(pathname)) {
                const login = new URL('/login', request.url);
                login.searchParams.set('next', pathname + search);
                return NextResponse.redirect(login);
            }
            return NextResponse.next();
        },

        handleError: async (error) => {
            console.error('auth middleware error', error);
            const { pathname } = request.nextUrl;
            if (requiredRolesFor(pathname)) {
                return NextResponse.redirect(new URL('/login', request.url));
            }
            return NextResponse.next();
        },
    });
}

export const config = {
    matcher: [
        '/api/login',
        '/api/logout',
        '/api/refresh-token',
        '/login',
        '/register',
        '/student/:path*',
        '/teacher/:path*',
        '/admin/:path*',
        '/kiosk/:path*',
        '/checkout/:path*',
        '/watch/:path*',
        '/quiz/:path*',
    ],
};
