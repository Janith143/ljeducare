/* eslint-disable @next/next/no-img-element */
import type { LandingTestimonials as LandingTestimonialsType } from '@ljeducare/shared';
import LandingSectionHeader from './LandingSectionHeader';

/** "Success Stories" — quote cards. */
export default function LandingTestimonials({ testimonials }: { testimonials: LandingTestimonialsType }) {
    return (
        <section className="testimonials section-padding bg-light" id="testimonials">
            <div className="container">
                <LandingSectionHeader section={testimonials} />
                <div className="testimonial-carousel fade-up">
                    {(testimonials.items ?? []).map((t, i) => (
                        <div className="testimonial-card glass-panel" key={`${t.name}-${i}`}>
                            <div className="quote-icon">
                                <i className="ph-fill ph-quotes" />
                            </div>
                            <p className="t-text">“{t.quote}”</p>
                            <div className="t-author">
                                {t.image && <img src={t.image} alt="" loading="lazy" />}
                                <div>
                                    <h4>{t.name}</h4>
                                    <p>{t.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
