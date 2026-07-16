/* eslint-disable @next/next/no-img-element */
import type { LandingFaculty as LandingFacultyType } from '@ljeducare/shared';
import LandingSectionHeader from './LandingSectionHeader';

/** Faculty rail. The `featured` member renders the highlighted founder-style card. */
export default function LandingFaculty({ faculty }: { faculty: LandingFacultyType }) {
    return (
        <section className="faculty section-padding" id="faculty">
            <div className="container">
                <LandingSectionHeader section={faculty} />
                <div className="faculty-slider fade-up">
                    {(faculty.items ?? []).map((m, i) => (
                        <div className={`faculty-card ${m.featured ? 'featured' : ''}`} key={`${m.name}-${i}`}>
                            <div className="faculty-img">
                                {m.image && <img src={m.image} alt={m.name} loading="lazy" />}
                                {m.featured && m.badge && <div className="faculty-badge">{m.badge}</div>}
                            </div>
                            <div className="faculty-info">
                                <h3>{m.name}</h3>
                                <p className="f-subject">{m.subject}</p>
                                {m.experience && (
                                    <p className="f-exp">
                                        <i className="ph ph-briefcase" /> {m.experience}
                                    </p>
                                )}
                                <a href={m.profileHref || '/teachers'} className="btn btn-outline btn-sm">
                                    View Profile
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
