/* eslint-disable @next/next/no-img-element */
import type { LandingPrograms as LandingProgramsType } from '@ljeducare/shared';
import LandingSectionHeader from './LandingSectionHeader';

/** "Choose Your Learning Path" — the big split program cards. */
export default function LandingPrograms({ programs }: { programs: LandingProgramsType }) {
    return (
        <section className="learning-path section-padding" id="programs">
            <div className="container">
                <LandingSectionHeader section={programs} />
                <div className="path-grid">
                    {(programs.items ?? []).map((p, i) => (
                        <a
                            key={`${p.title}-${i}`}
                            href={p.href || '/categories'}
                            className={`path-card ${i % 2 === 0 ? 'fade-left' : 'fade-right'}`}
                        >
                            <div className="path-img">
                                {p.image && <img src={p.image} alt={p.title} loading="lazy" />}
                                <div className="path-overlay" />
                            </div>
                            <div className="path-content">
                                <h3>{p.title}</h3>
                                <p>{p.description}</p>
                                {(p.subjects?.length ?? 0) > 0 && (
                                    <ul className="path-subjects">
                                        {p.subjects!.map((s, j) => (
                                            <li key={`${s}-${j}`}>{s}</li>
                                        ))}
                                    </ul>
                                )}
                                <div className="path-cta">
                                    <span>{p.ctaLabel || 'Explore'}</span>
                                    <i className="ph ph-arrow-right" />
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}
