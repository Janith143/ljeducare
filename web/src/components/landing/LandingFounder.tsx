/* eslint-disable @next/next/no-img-element */
import type { LandingFounder as LandingFounderType } from '@ljeducare/shared';

/** Founder profile: portrait, bio, achievement list and animated counters. */
export default function LandingFounder({ founder }: { founder: LandingFounderType }) {
    return (
        <section className="founder section-padding" id="founder">
            <div className="container">
                <div className="founder-grid">
                    <div className="founder-image fade-right">
                        {founder.image && <img src={founder.image} alt={founder.name ?? 'Founder'} />}
                        {founder.badge && (
                            <div className="founder-badge glass-panel">
                                <i className="ph-fill ph-certificate" />
                                <span>{founder.badge}</span>
                            </div>
                        )}
                    </div>

                    <div className="founder-content fade-left">
                        {founder.eyebrow && <h3 className="section-subtitle">{founder.eyebrow}</h3>}
                        {founder.name && <h2>{founder.name}</h2>}
                        {founder.role && <h4 className="founder-title">{founder.role}</h4>}
                        {founder.bio && <p className="founder-bio">{founder.bio}</p>}

                        {(founder.achievements?.length ?? 0) > 0 && (
                            <div className="founder-achievements">
                                {founder.achievements!.map((a, i) => (
                                    <div className="achievement" key={`${a.text}-${i}`}>
                                        <i className={`ph ${a.icon}`} />
                                        <span>{a.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {(founder.stats?.length ?? 0) > 0 && (
                            <div className="founder-stats">
                                {founder.stats!.map((s, i) => (
                                    <div className="f-stat" key={`${s.label}-${i}`}>
                                        <h3 className="counter-value" data-target={s.value}>
                                            0
                                        </h3>
                                        {s.suffix && <span>{s.suffix}</span>}
                                        <p>{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {founder.ctaLabel && (
                            <a href={founder.ctaHref || '#about'} className="btn btn-primary" style={{ marginTop: '2rem' }}>
                                {founder.ctaLabel} <i className="ph ph-arrow-right" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
