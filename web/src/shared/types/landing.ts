/**
 * settings/landing — the public marketing landing page (`/`), fully admin-editable.
 *
 * Every section is optional: `getLandingSettings()` deep-merges the stored doc over
 * DEFAULT_LANDING, so an untouched install renders the original designed page and the
 * admin CMS opens pre-filled rather than blank.
 *
 * Images are Storage download URLs (landing-images/…) or any absolute URL.
 */

/** A section that can be hidden from the page without deleting its content. */
export interface LandingSection {
    /** false hides the whole section. Default true. */
    enabled?: boolean;
    /** Section heading (rendered in .section-header). */
    title?: string;
    /** Section sub-heading. */
    subtitle?: string;
}

export interface LandingNavLink {
    label: string;
    /** '#about' for an on-page anchor, or any path/URL. */
    href: string;
}

export interface LandingBrand {
    /** Wordmark shown before the bold part, e.g. "Edu" in EduElite. */
    name?: string;
    /** Bold half of the wordmark, e.g. "Elite". */
    nameAccent?: string;
    /** Phosphor icon name, e.g. 'ph-graduation-cap'. Ignored when logoImage is set. */
    logoIcon?: string;
    /** Image logo — replaces the icon + wordmark when present. */
    logoImage?: string;
    navLinks?: LandingNavLink[];
    /** Primary nav CTA. */
    ctaLabel?: string;
    ctaHref?: string;
}

export interface LandingHeroCategory {
    icon: string;        // phosphor icon name
    title: string;
    subtitle: string;
    href?: string;
}

export interface LandingHeroMetric {
    value: string;       // free text — "20+", "95%"
    label: string;
}

export interface LandingHero extends LandingSection {
    badge?: string;
    /** Static text before the rotating word. */
    titlePrefix?: string;
    /** Words cycled by the hero rotator. */
    rotatingWords?: string[];
    /** Accent line under the rotator, e.g. "& 200+ more". */
    titleAccent?: string;
    /** Static text after the accent, e.g. "subjects." */
    titleSuffix?: string;
    subtitle?: string;
    primaryCtaLabel?: string;
    primaryCtaHref?: string;
    secondaryCtaLabel?: string;
    secondaryCtaHref?: string;
    /** Social-proof row. */
    proofAvatars?: string[];
    proofMoreLabel?: string;     // "15k+"
    proofText?: string;          // "Loved by 15,000+ students & parents"
    showProofStars?: boolean;
    metrics?: LandingHeroMetric[];
    /** Bento image + its live badge. */
    image?: string;
    imageBadge?: string;         // "42 live classes now"
    showImageBadge?: boolean;
    categories?: LandingHeroCategory[];
    /** Floating depth cards. */
    floatCardTitle?: string;
    floatCardSubtitle?: string;
    floatChip1?: string;
    floatChip1Icon?: string;
    floatChip2?: string;
    floatChip2Icon?: string;
    /** Scrolling breadth marquee. */
    marqueeWords?: string[];
}

export interface LandingTrustLogo {
    image: string;
    alt?: string;
}

export interface LandingTrust extends LandingSection {
    /** Lead-in line above the logo row. */
    text?: string;
    logos?: LandingTrustLogo[];
}

export interface LandingAchievement {
    icon: string;
    text: string;
}

export interface LandingCounterStat {
    /** Numeric target the counter animates to. */
    value: number;
    /** Optional suffix rendered next to the number, e.g. '+' or '%'. */
    suffix?: string;
    label: string;
}

export interface LandingFounder extends LandingSection {
    image?: string;
    badge?: string;              // "Ph.D. in Education"
    eyebrow?: string;            // "Meet Our Founder"
    name?: string;
    role?: string;               // "Founder & Academic Director"
    bio?: string;
    achievements?: LandingAchievement[];
    stats?: LandingCounterStat[];
    ctaLabel?: string;
    ctaHref?: string;
}

export interface LandingFeature {
    icon: string;
    title: string;
    description: string;
}

export interface LandingFeatures extends LandingSection {
    items?: LandingFeature[];
}

export interface LandingPath {
    image: string;
    title: string;
    description: string;
    /** Bullet chips under the copy. */
    subjects?: string[];
    ctaLabel?: string;
    href?: string;
}

export interface LandingPrograms extends LandingSection {
    items?: LandingPath[];
}

export interface LandingSubject {
    icon: string;
    title: string;
    description: string;
    href?: string;
    /**
     * Which filter chips show this card. Matched exactly (case-insensitive).
     * When empty, the card falls back to whole-word matching on its title/description.
     */
    tags?: string[];
}

export interface LandingSubjects extends LandingSection {
    showSearch?: boolean;
    searchPlaceholder?: string;
    /** Filter chips. The first is selected by default. */
    chips?: string[];
    items?: LandingSubject[];
}

export interface LandingFacultyMember {
    image: string;
    name: string;
    subject: string;             // "Head of Sciences"
    experience?: string;         // "15 Years Exp."
    /** Renders the highlighted founder-style card. */
    featured?: boolean;
    badge?: string;              // "Founder & Director" — featured card only
    profileHref?: string;
}

export interface LandingFaculty extends LandingSection {
    items?: LandingFacultyMember[];
}

export interface LandingTestimonial {
    quote: string;
    image?: string;
    name: string;
    role: string;
}

export interface LandingTestimonials extends LandingSection {
    items?: LandingTestimonial[];
}

export interface LandingResultsBox {
    icon: string;
    title: string;
    stats?: LandingCounterStat[];
}

export interface LandingResults extends LandingSection {
    boxes?: LandingResultsBox[];
}

export interface LandingGalleryItem {
    image: string;
    caption?: string;
    /** Masonry sizing. */
    size?: 'normal' | 'tall' | 'wide';
}

export interface LandingGallery extends LandingSection {
    items?: LandingGalleryItem[];
}

export interface LandingRecognitionItem {
    year: string;
    title: string;
    description: string;
}

export interface LandingRecognition extends LandingSection {
    items?: LandingRecognitionItem[];
}

export interface LandingEvent {
    id: string;
    /** ISO date (YYYY-MM-DD) — drives the month/day date box and auto-hiding. */
    date: string;
    title: string;
    time?: string;               // "09:00 AM - 12:00 PM"
    location?: string;           // "Main Auditorium"
    ctaLabel?: string;
    href?: string;
    enabled?: boolean;
}

export interface LandingEvents extends LandingSection {
    /** Hide events whose date has passed. Default true. */
    hidePastEvents?: boolean;
    /** Copy shown when no upcoming events remain. */
    emptyText?: string;
    items?: LandingEvent[];
}

export interface LandingFaqItem {
    id: string;
    question: string;
    answer: string;
    enabled?: boolean;
}

export interface LandingFaq extends LandingSection {
    items?: LandingFaqItem[];
}

export interface LandingContactInfo {
    icon: string;
    label: string;               // "Visit Us"
    value: string;               // "123 Education Boulevard"
    /** Makes the value a link (tel:, mailto:, maps URL…). */
    href?: string;
}

export interface LandingContact extends LandingSection {
    items?: LandingContactInfo[];
    /** Map panel: an <iframe> embed URL wins over a static image. */
    mapEmbedUrl?: string;
    mapImage?: string;
    showForm?: boolean;
    formTitle?: string;
    /** Options for the "Program of Interest" select. */
    programOptions?: string[];
    submitLabel?: string;
    /** Confirmation shown after a successful submit. */
    successMessage?: string;
}

export interface LandingSocialLink {
    icon: string;                // 'ph-facebook-logo'
    href: string;
    label?: string;
}

export interface LandingFooterColumn {
    title: string;
    links?: LandingNavLink[];
}

export interface LandingFooter {
    /** Blurb under the footer logo. */
    description?: string;
    socialLinks?: LandingSocialLink[];
    columns?: LandingFooterColumn[];
    showNewsletter?: boolean;
    newsletterTitle?: string;
    newsletterText?: string;
    newsletterSuccessMessage?: string;
    /** {year} is replaced with the current year. */
    copyright?: string;
    legalLinks?: LandingNavLink[];
}

export interface LandingSeo {
    /** <title>. Falls back to SITE.name. */
    title?: string;
    description?: string;
    /** og:image */
    shareImage?: string;
}

/** The whole landing page. */
export interface LandingSettings {
    brand?: LandingBrand;
    hero?: LandingHero;
    trust?: LandingTrust;
    founder?: LandingFounder;
    features?: LandingFeatures;
    programs?: LandingPrograms;
    subjects?: LandingSubjects;
    faculty?: LandingFaculty;
    testimonials?: LandingTestimonials;
    results?: LandingResults;
    gallery?: LandingGallery;
    recognition?: LandingRecognition;
    events?: LandingEvents;
    faq?: LandingFaq;
    contact?: LandingContact;
    footer?: LandingFooter;
    seo?: LandingSeo;
    updatedAt?: string;
    updatedBy?: string;
}

/** Editable top-level section keys, for the CMS tab list. */
export type LandingSectionKey = Exclude<keyof LandingSettings, 'updatedAt' | 'updatedBy'>;

export type InquiryStatus = 'new' | 'read' | 'replied' | 'archived';

/** landing_inquiries/{id} — a contact-form submission. Server-only writes. */
export interface LandingInquiry {
    id: string;
    name: string;
    email: string;
    phone?: string;
    program?: string;
    message: string;
    status: InquiryStatus;
    createdAt: string;           // ISO
    /** Coarse spam signals kept for triage. */
    userAgent?: string;
    ip?: string;
}

/** newsletter_subscribers/{id} — doc id is the lowercased email. Server-only writes. */
export interface NewsletterSubscriber {
    id: string;
    email: string;
    createdAt: string;           // ISO
    unsubscribedAt?: string;
}
