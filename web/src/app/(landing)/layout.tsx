import '@phosphor-icons/web/regular';
import '@phosphor-icons/web/fill';
import './landing.css';

/**
 * The marketing landing page stands alone: it ships its own navbar and footer
 * (see components/landing), so it deliberately skips the public Header/Footer
 * shell used by the rest of the storefront.
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {/* React hoists these into <head>. Poppins is the landing design's typeface. */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            {/* Loading a font per-route is deliberate here: Poppins belongs to the landing
                design, and the rest of the LMS shouldn't pay to download it. The lint rule
                predates the App Router, where a layout <link> is the supported approach. */}
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
            />
            {children}
        </>
    );
}
