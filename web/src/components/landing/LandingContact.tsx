'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import type { LandingContact as LandingContactType } from '@ljeducare/shared';
import { submitInquiryAction } from '@/app/(landing)/actions';

/** Contact details, map panel and the inquiry form (posts to the admin inbox). */
export default function LandingContact({ contact }: { contact: LandingContactType }) {
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        setError(null);
        const res = await submitInquiryAction({
            name: String(fd.get('name') ?? ''),
            email: String(fd.get('email') ?? ''),
            phone: String(fd.get('phone') ?? ''),
            program: String(fd.get('program') ?? ''),
            message: String(fd.get('message') ?? ''),
            website: String(fd.get('website') ?? ''),
        });
        setBusy(false);
        if (res.error) {
            setError(res.error);
            return;
        }
        setSent(true);
    }

    return (
        <section className="contact section-padding bg-light" id="contact">
            <div className="container">
                <div className="section-header fade-up">
                    {contact.title && <h2>{contact.title}</h2>}
                    {contact.subtitle && <p>{contact.subtitle}</p>}
                </div>

                <div className="contact-grid">
                    {/* Contact info & map */}
                    <div className="contact-info fade-right">
                        {(contact.items ?? []).map((item, i) => (
                            <div className="info-item glass-panel" key={`${item.label}-${i}`}>
                                <div className="info-icon">
                                    <i className={`ph ${item.icon}`} />
                                </div>
                                <div>
                                    <h4>{item.label}</h4>
                                    <p>{item.href ? <a href={item.href}>{item.value}</a> : item.value}</p>
                                </div>
                            </div>
                        ))}

                        {(contact.mapEmbedUrl || contact.mapImage) && (
                            <div className="map-container glass-panel">
                                {contact.mapEmbedUrl ? (
                                    <iframe
                                        src={contact.mapEmbedUrl}
                                        title="Map"
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        style={{ width: '100%', height: 250, border: 0, borderRadius: 'var(--radius-md)' }}
                                    />
                                ) : (
                                    <img
                                        src={contact.mapImage}
                                        alt="Map"
                                        style={{ width: '100%', height: 250, objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Inquiry form */}
                    {contact.showForm !== false && (
                        <div className="contact-form glass-panel fade-left">
                            <h3>{contact.formTitle || 'Send us a message'}</h3>

                            {sent ? (
                                <p role="status" className="form-success">
                                    {contact.successMessage || "Thank you — we've received your message."}
                                </p>
                            ) : (
                                <form onSubmit={onSubmit}>
                                    {error && (
                                        <p role="alert" className="form-error">
                                            {error}
                                        </p>
                                    )}
                                    <div className="form-group">
                                        <label htmlFor="lp-name">Full Name</label>
                                        <input id="lp-name" name="name" type="text" placeholder="John Doe" required />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="lp-email">Email Address</label>
                                        <input id="lp-email" name="email" type="email" placeholder="john@example.com" required />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="lp-phone">Phone Number (WhatsApp)</label>
                                        <input id="lp-phone" name="phone" type="tel" placeholder="+94 77 123 4567" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="lp-program">Program of Interest</label>
                                        <select id="lp-program" name="program" defaultValue={contact.programOptions?.[0] ?? ''}>
                                            {(contact.programOptions ?? []).map((opt, i) => (
                                                <option key={`${opt}-${i}`} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="lp-message">Message</label>
                                        <textarea id="lp-message" name="message" rows={4} placeholder="How can we help you?" required />
                                    </div>

                                    {/* Honeypot — hidden from users, catches naive bots. */}
                                    <input
                                        type="text"
                                        name="website"
                                        tabIndex={-1}
                                        autoComplete="off"
                                        aria-hidden="true"
                                        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }}
                                    />

                                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
                                        {busy ? 'Sending…' : contact.submitLabel || 'Submit Inquiry'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
