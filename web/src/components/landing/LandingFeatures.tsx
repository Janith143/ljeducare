import type { LandingFeatures as LandingFeaturesType } from '@ljeducare/shared';
import LandingSectionHeader from './LandingSectionHeader';

/** "Why Choose Us" — icon feature grid. */
export default function LandingFeatures({ features }: { features: LandingFeaturesType }) {
    return (
        <section className="features section-padding bg-light" id="about">
            <div className="container">
                <LandingSectionHeader section={features} />
                <div className="features-grid">
                    {(features.items ?? []).map((f, i) => (
                        <div className="feature-card fade-up" key={`${f.title}-${i}`} style={{ transitionDelay: `${i * 0.1}s` }}>
                            <div className="f-icon">
                                <i className={`ph ${f.icon}`} />
                            </div>
                            <h3>{f.title}</h3>
                            <p>{f.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
