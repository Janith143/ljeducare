'use client';

import { useState } from 'react';
import type { LandingSubjects as LandingSubjectsType } from '@ljeducare/shared';
import { filterSubjects } from '@ljeducare/shared';

/**
 * "Explore Subjects" — search box, filter chips and the subject card grid.
 *
 * A client component only so the chips can filter without a round-trip; Next still
 * server-renders the full card list into the HTML, so the content stays indexable.
 * The search box is a plain GET form to /search, so it works with JS disabled too.
 */
export default function LandingSubjects({ subjects }: { subjects: LandingSubjectsType }) {
    const chips = (subjects.chips ?? []).filter(Boolean);
    const [active, setActive] = useState(0);
    const items = subjects.items ?? [];

    // The first chip is the catch-all ("All"); the rest match on each card's tags.
    const shown = filterSubjects(items, chips, active);

    return (
        <section className="subjects section-padding bg-light" id="subjects">
            <div className="container">
                <div className="section-header fade-up">
                    {subjects.title && <h2>{subjects.title}</h2>}
                    {subjects.subtitle && <p>{subjects.subtitle}</p>}

                    {subjects.showSearch !== false && (
                        <form className="search-bar" action="/search" method="get">
                            <i className="ph ph-magnifying-glass" />
                            <input
                                type="text"
                                name="q"
                                aria-label="Search courses"
                                placeholder={subjects.searchPlaceholder || 'Search for courses, subjects, or skills...'}
                            />
                            <button type="submit" className="btn btn-primary">
                                Search
                            </button>
                        </form>
                    )}

                    {chips.length > 0 && (
                        <div className="category-chips">
                            {chips.map((chip, i) => (
                                <span
                                    key={`${chip}-${i}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={i === active}
                                    className={`chip ${i === active ? 'active' : ''}`}
                                    onClick={() => setActive(i)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setActive(i);
                                        }
                                    }}
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="subjects-grid fade-up">
                    {shown.map((s, i) => (
                        <a key={`${s.title}-${i}`} href={s.href || '/categories'} className="subject-card glass-panel">
                            <div className="s-icon">
                                <i className={`ph ${s.icon}`} />
                            </div>
                            <h3>{s.title}</h3>
                            <p>{s.description}</p>
                        </a>
                    ))}
                </div>

                {shown.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                        No subjects match “{chips[active]}”.
                    </p>
                )}
            </div>
        </section>
    );
}
