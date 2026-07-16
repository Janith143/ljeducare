import type { LandingEvents as LandingEventsType } from '@ljeducare/shared';
import { eventDateParts, toDateKey, visibleEvents } from '@ljeducare/shared';
import LandingSectionHeader from './LandingSectionHeader';

/**
 * Upcoming events. Past events drop off automatically (unless the admin turns
 * `hidePastEvents` off), so the section doesn't go stale on its own.
 */
export default function LandingEvents({ events }: { events: LandingEventsType }) {
    const items = visibleEvents(events, toDateKey(new Date()));

    return (
        <section className="events section-padding bg-light" id="events">
            <div className="container">
                <LandingSectionHeader section={events} />

                {items.length === 0 ? (
                    <p className="fade-up" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                        {events.emptyText || 'No events scheduled right now — check back soon.'}
                    </p>
                ) : (
                    <div className="events-list fade-up">
                        {items.map((e) => {
                            const { month, day } = eventDateParts(e.date);
                            return (
                                <div className="event-row glass-panel" key={e.id}>
                                    <div className="event-date-box">
                                        <span className="e-month">{month}</span>
                                        <span className="e-day">{day}</span>
                                    </div>
                                    <div className="event-details">
                                        <h3>{e.title}</h3>
                                        <div className="event-meta">
                                            {e.time && (
                                                <span>
                                                    <i className="ph ph-clock" /> {e.time}
                                                </span>
                                            )}
                                            {e.time && e.location && <span className="meta-divider">|</span>}
                                            {e.location && (
                                                <span>
                                                    <i className="ph ph-map-pin" /> {e.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {e.ctaLabel && (
                                        <div className="event-action">
                                            <a href={e.href || '#contact'} className="btn btn-outline btn-sm">
                                                {e.ctaLabel} <i className="ph ph-arrow-right" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
