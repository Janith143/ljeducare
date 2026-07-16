import Link from 'next/link';
import type { LandingBrand } from '@ljeducare/shared';
import LandingLogo from './LandingLogo';
import { LANDING_PATH } from '@/lib/site';

/** Sticky top navigation. The `.scrolled` / `.active` classes are driven by LandingBehaviors. */
export default function LandingNav({ brand }: { brand: LandingBrand }) {
    return (
        <nav className="navbar">
            <div className="container nav-container">
                {/* Logo returns to the landing page itself, not the LMS home. */}
                <Link href={LANDING_PATH} className="logo">
                    <LandingLogo brand={brand} />
                </Link>

                <ul className="nav-links">
                    {(brand.navLinks ?? []).map((link) => (
                        <li key={`${link.label}-${link.href}`}>
                            <a href={link.href}>{link.label}</a>
                        </li>
                    ))}
                    <li>
                        <a href="/login">Log in</a>
                    </li>
                    {brand.ctaLabel && (
                        <li>
                            <a href={brand.ctaHref || '/register'} className="btn btn-primary btn-sm">
                                {brand.ctaLabel}
                            </a>
                        </li>
                    )}
                </ul>

                <div className="mobile-menu-btn" role="button" tabIndex={0} aria-label="Open menu">
                    <i className="ph ph-list" />
                </div>
            </div>
        </nav>
    );
}
