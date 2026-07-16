/* eslint-disable @next/next/no-img-element */
import type { LandingTrust as LandingTrustType } from '@ljeducare/shared';

/** Partner / accreditation logo strip. */
export default function LandingTrust({ trust }: { trust: LandingTrustType }) {
    const logos = (trust.logos ?? []).filter((l) => l.image);
    if (logos.length === 0 && !trust.text) return null;

    return (
        <section className="trust-bar">
            <div className="container">
                {trust.text && <p className="trust-text">{trust.text}</p>}
                <div className="trust-logos">
                    {logos.map((logo, i) => (
                        <img key={`${logo.image}-${i}`} src={logo.image} alt={logo.alt || 'Partner logo'} loading="lazy" />
                    ))}
                </div>
            </div>
        </section>
    );
}
