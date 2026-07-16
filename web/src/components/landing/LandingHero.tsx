/* eslint-disable @next/next/no-img-element */
import { Fragment } from 'react';
import type { LandingHero as LandingHeroType } from '@ljeducare/shared';

/**
 * Hero: rotating headline, social proof, metrics and the category bento.
 * The rotator and pointer parallax are driven by LandingBehaviors.
 */
export default function LandingHero({ hero }: { hero: LandingHeroType }) {
    const words = hero.rotatingWords?.filter(Boolean) ?? [];
    const marquee = hero.marqueeWords?.filter(Boolean) ?? [];

    return (
        <section className="hero" id="home">
            {/* Animated brand background */}
            <div className="hero-aurora" aria-hidden="true">
                <span className="orb orb-1" />
                <span className="orb orb-2" />
                <span className="orb orb-3" />
            </div>
            <div className="hero-grid-lines" aria-hidden="true" />

            <div className="container hero-container">
                {/* LEFT: Copy */}
                <div className="hero-content fade-up">
                    {hero.badge && (
                        <div className="badge">
                            <span className="badge-dot" />
                            {hero.badge}
                        </div>
                    )}

                    <h1>
                        {hero.titlePrefix}{' '}
                        {words.length > 0 && (
                            <span className="rotator">
                                <span
                                    className="rotator-word"
                                    id="rotatorWord"
                                    data-words={JSON.stringify(words)}
                                >
                                    {words[0]}
                                </span>
                            </span>
                        )}
                        <br />
                        {hero.titleAccent && <span className="h1-accent">{hero.titleAccent}</span>}{' '}
                        {hero.titleSuffix}
                    </h1>

                    {hero.subtitle && <p className="hero-sub">{hero.subtitle}</p>}

                    <div className="hero-btns">
                        {hero.primaryCtaLabel && (
                            <a href={hero.primaryCtaHref || '#programs'} className="btn btn-primary btn-lg">
                                {hero.primaryCtaLabel} <i className="ph ph-arrow-right" />
                            </a>
                        )}
                        {hero.secondaryCtaLabel && (
                            <a href={hero.secondaryCtaHref || '#founder'} className="btn btn-glass btn-lg">
                                <i className="ph-fill ph-play-circle" /> {hero.secondaryCtaLabel}
                            </a>
                        )}
                    </div>

                    {(hero.proofAvatars?.length || hero.proofText) && (
                        <div className="hero-proof">
                            <div className="proof-avatars">
                                {(hero.proofAvatars ?? []).map((src, i) => (
                                    <img key={`${src}-${i}`} src={src} alt="" loading="lazy" />
                                ))}
                                {hero.proofMoreLabel && <span className="avatar-more">{hero.proofMoreLabel}</span>}
                            </div>
                            <div className="proof-text">
                                {hero.showProofStars !== false && (
                                    <div className="proof-stars">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <i key={i} className="ph-fill ph-star" />
                                        ))}
                                    </div>
                                )}
                                {hero.proofText && <span>{hero.proofText}</span>}
                            </div>
                        </div>
                    )}

                    {(hero.metrics?.length ?? 0) > 0 && (
                        <div className="hero-metrics">
                            {hero.metrics!.map((m, i) => (
                                <Fragment key={`${m.label}-${i}`}>
                                    {i > 0 && <span className="hm-div" />}
                                    <div>
                                        <strong>{m.value}</strong>
                                        <span>{m.label}</span>
                                    </div>
                                </Fragment>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT: Category bento */}
                <div className="hero-visual">
                    <div className="hero-bento">
                        {hero.image && (
                            <div className="bento-tile bento-img fade-up" style={{ transitionDelay: '.05s' }}>
                                <img src={hero.image} alt="" loading="lazy" />
                                {hero.showImageBadge !== false && hero.imageBadge && (
                                    <div className="bento-live">
                                        <span className="live-dot" /> {hero.imageBadge}
                                    </div>
                                )}
                            </div>
                        )}

                        {(hero.categories ?? []).map((cat, i) => (
                            <a
                                key={`${cat.title}-${i}`}
                                href={cat.href || '#subjects'}
                                className="bento-tile bento-cat fade-up"
                                style={{ transitionDelay: `${0.12 + i * 0.06}s` }}
                            >
                                <div className="cat-ic">
                                    <i className={`ph ${cat.icon}`} />
                                </div>
                                <h4>{cat.title}</h4>
                                <span>{cat.subtitle}</span>
                            </a>
                        ))}
                    </div>

                    {/* Floating depth cards */}
                    {hero.floatCardTitle && (
                        <div className="float-card float-cert">
                            <div className="fc-ic">
                                <i className="ph-fill ph-certificate" />
                            </div>
                            <div className="fc-text">
                                <strong>{hero.floatCardTitle}</strong>
                                <span>{hero.floatCardSubtitle}</span>
                            </div>
                        </div>
                    )}
                    {hero.floatChip1 && (
                        <div className="float-card float-chip">
                            <i className={`ph ${hero.floatChip1Icon || 'ph-first-aid-kit'}`} /> {hero.floatChip1}
                        </div>
                    )}
                    {hero.floatChip2 && (
                        <div className="float-card float-chip float-chip-2">
                            <i className={`ph ${hero.floatChip2Icon || 'ph-music-notes'}`} /> {hero.floatChip2}
                        </div>
                    )}
                </div>
            </div>

            {/* Breadth marquee — the list is duplicated so the CSS loop is seamless. */}
            {marquee.length > 0 && (
                <div className="hero-marquee" aria-hidden="true">
                    <div className="marquee-track">
                        {[...marquee, ...marquee].map((word, i) => (
                            <span key={`${word}-${i}`}>{word}</span>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
