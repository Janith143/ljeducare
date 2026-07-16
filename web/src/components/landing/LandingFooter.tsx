import Link from 'next/link';
import type { LandingBrand, LandingFooter as LandingFooterType } from '@ljeducare/shared';
import LandingLogo from './LandingLogo';
import LandingNewsletterForm from './LandingNewsletterForm';
import { LANDING_PATH } from '@/lib/site';

/** Site footer: brand blurb, social links, link columns, newsletter and legal row. */
export default function LandingFooter({ footer, brand }: { footer: LandingFooterType; brand: LandingBrand }) {
    const copyright = (footer.copyright || '© {year} LJ Educare. All rights reserved.').replace(
        '{year}',
        String(new Date().getFullYear()),
    );

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <Link href={LANDING_PATH} className="logo">
                            <LandingLogo brand={brand} />
                        </Link>
                        {footer.description && <p>{footer.description}</p>}
                        {(footer.socialLinks?.length ?? 0) > 0 && (
                            <div className="social-links">
                                {footer.socialLinks!.map((s, i) => (
                                    <a key={`${s.href}-${i}`} href={s.href} aria-label={s.label ?? 'Social link'}>
                                        <i className={`ph ${s.icon}`} />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {(footer.columns ?? []).map((col, i) => (
                        <div className="footer-links" key={`${col.title}-${i}`}>
                            <h3>{col.title}</h3>
                            <ul>
                                {(col.links ?? []).map((link, j) => (
                                    <li key={`${link.label}-${j}`}>
                                        <a href={link.href}>{link.label}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {footer.showNewsletter !== false && (
                        <div className="footer-newsletter">
                            <h3>{footer.newsletterTitle || 'Newsletter'}</h3>
                            {footer.newsletterText && <p>{footer.newsletterText}</p>}
                            <LandingNewsletterForm successMessage={footer.newsletterSuccessMessage} />
                        </div>
                    )}
                </div>

                <div className="footer-bottom">
                    <p>{copyright}</p>
                    <div className="footer-legal">
                        {(footer.legalLinks ?? []).map((link, i) => (
                            <a key={`${link.href}-${i}`} href={link.href}>
                                {link.label}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
