'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

declare global {
    interface Window {
        ttq?: { page: () => void };
    }
}

// Set in apphosting.yaml. Unset locally on purpose: dev must not report to the live pixel.
const PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

// ALLOWLIST of public browse pages — never a denylist. The pixel sends the page's full URL
// (query string included) to TikTok, and everywhere else carries something that must stay
// private: /auth/action?oobCode=… is a one-time password-reset/verify code, /payment/*
// carries sale ids and gateway tokens, /login, /student, /admin, /teacher, /kiosk are
// account areas. New routes stay unreported until deliberately added here. (/search is out
// too: free-text queries.) Auth and payment links arrive as full page loads, so the script
// is never loaded on them.
const PUBLIC_PAGE =
    /^\/($|(portal|courses|classes|quizzes|teachers|categories|exams|cart|terms|privacy|refund-policy)(\/|$))/;

/**
 * TikTok Pixel. TikTok's stock snippet reports one page view per full page load, but this
 * is an App Router site where most navigation is client-side — so every later route
 * change is reported here.
 */
export default function TikTokPixel() {
    const pathname = usePathname();
    const tracked = !!PIXEL_ID && PUBLIC_PAGE.test(pathname);
    const snippetRan = useRef(false);

    useEffect(() => {
        if (!tracked) return;
        // First tracked page of this document: the snippet below reports it itself.
        if (!snippetRan.current) {
            snippetRan.current = true;
            return;
        }
        window.ttq?.page();
    }, [pathname, tracked]);

    if (!tracked) return null;
    return (
        <Script id="tiktok-pixel" strategy="afterInteractive">
            {`
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

  ttq.load('${PIXEL_ID}');
  ttq.page();
}(window, document, 'ttq');
`}
        </Script>
    );
}
