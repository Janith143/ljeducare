import type { LandingFaq as LandingFaqType } from '@ljeducare/shared';
import { visibleFaqs } from '@ljeducare/shared';
import LandingSectionHeader from './LandingSectionHeader';

/** FAQ accordion. Open/close is handled by LandingBehaviors; the first item starts open. */
export default function LandingFaq({ faq }: { faq: LandingFaqType }) {
    const items = visibleFaqs(faq.items);
    if (items.length === 0) return null;

    return (
        <section className="faq section-padding" id="faq">
            <div className="container">
                <LandingSectionHeader section={faq} />
                <div className="faq-container fade-up">
                    {items.map((item, i) => (
                        <div className={`faq-item ${i === 0 ? 'active' : ''}`} key={item.id}>
                            <div className="faq-header">
                                <h3>{item.question}</h3>
                                <i className="ph ph-caret-down" />
                            </div>
                            <div className="faq-body">
                                <p>{item.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
