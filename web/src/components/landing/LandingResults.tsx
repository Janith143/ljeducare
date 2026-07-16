import type { LandingResults as LandingResultsType } from '@ljeducare/shared';
import LandingSectionHeader from './LandingSectionHeader';

/** "Proven Track Record" — split stat boxes with animated counters. */
export default function LandingResults({ results }: { results: LandingResultsType }) {
    return (
        <section className="results section-padding" id="achievements">
            <div className="container">
                <LandingSectionHeader section={results} />
                <div className="results-split">
                    {(results.boxes ?? []).map((box, i) => (
                        <div
                            className={`results-box glass-panel ${i % 2 === 0 ? 'fade-right' : 'fade-left'}`}
                            key={`${box.title}-${i}`}
                        >
                            <div className="r-icon">
                                <i className={`ph ${box.icon}`} />
                            </div>
                            <h3>{box.title}</h3>
                            <div className="r-stats">
                                {(box.stats ?? []).map((s, j) => (
                                    <div className="r-stat-item" key={`${s.label}-${j}`}>
                                        <h4 className="counter-value" data-target={s.value}>
                                            0
                                        </h4>
                                        {s.suffix && <span>{s.suffix}</span>}
                                        <p>{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
