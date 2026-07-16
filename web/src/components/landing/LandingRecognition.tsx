import type { LandingRecognition as LandingRecognitionType } from '@ljeducare/shared';
import LandingSectionHeader from './LandingSectionHeader';

/** Awards timeline — items alternate sides via the `.right` modifier. */
export default function LandingRecognition({ recognition }: { recognition: LandingRecognitionType }) {
    return (
        <section className="recognition section-padding" id="recognition">
            <div className="container">
                <LandingSectionHeader section={recognition} />
                <div className="timeline fade-up">
                    {(recognition.items ?? []).map((item, i) => (
                        <div className={`timeline-item ${i % 2 === 1 ? 'right' : ''}`} key={`${item.year}-${i}`}>
                            <div className="timeline-dot" />
                            <div className="timeline-content glass-panel">
                                <span className="t-year">{item.year}</span>
                                <h3>{item.title}</h3>
                                <p>{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
