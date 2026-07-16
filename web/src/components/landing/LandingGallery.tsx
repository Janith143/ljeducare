/* eslint-disable @next/next/no-img-element */
import type { LandingGallery as LandingGalleryType } from '@ljeducare/shared';
import LandingSectionHeader from './LandingSectionHeader';

/** Campus gallery — masonry grid; `size` drives the tall/wide spans. */
export default function LandingGallery({ gallery }: { gallery: LandingGalleryType }) {
    const items = (gallery.items ?? []).filter((i) => i.image);
    if (items.length === 0) return null;

    return (
        <section className="campus-life section-padding bg-light" id="campus">
            <div className="container">
                <LandingSectionHeader section={gallery} />
                <div className="masonry-gallery fade-up">
                    {items.map((item, i) => (
                        <div
                            className={`masonry-item ${item.size && item.size !== 'normal' ? item.size : ''}`}
                            key={`${item.image}-${i}`}
                        >
                            <img src={item.image} alt={item.caption ?? ''} loading="lazy" />
                            {item.caption && (
                                <div className="gallery-overlay">
                                    <span>{item.caption}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
