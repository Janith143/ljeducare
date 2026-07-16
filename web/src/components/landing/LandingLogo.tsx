/* eslint-disable @next/next/no-img-element */
import type { LandingBrand } from '@ljeducare/shared';

/** The wordmark, shared by the navbar and the footer. An uploaded image wins over the icon. */
export default function LandingLogo({ brand }: { brand: LandingBrand }) {
    if (brand.logoImage) {
        return <img src={brand.logoImage} alt={`${brand.name ?? ''}${brand.nameAccent ?? ''}`} className="logo-img" />;
    }
    return (
        <>
            <i className={`ph ${brand.logoIcon || 'ph-graduation-cap'}`} />
            <span>
                {brand.name}
                <strong>{brand.nameAccent}</strong>
            </span>
        </>
    );
}
