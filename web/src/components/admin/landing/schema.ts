import type { LandingSectionKey } from '@ljeducare/shared';
import { newLandingItemId } from '@ljeducare/shared';

/**
 * Declarative description of the landing-page CMS.
 *
 * The editor is schema-driven rather than 17 hand-written forms: every section
 * shares the same field renderers, save flow and list add/remove/reorder, so
 * exposing a new field is a one-line change here.
 */
export type Field =
    | { kind: 'text'; key: string; label: string; placeholder?: string; help?: string; wide?: boolean }
    | { kind: 'textarea'; key: string; label: string; rows?: number; placeholder?: string; help?: string }
    | { kind: 'image'; key: string; label: string; help?: string }
    | { kind: 'icon'; key: string; label: string; help?: string }
      /**
       * `defaultOn` is what an ABSENT value means. Most flags follow the
       * `enabled !== false` convention (absent = on); opt-in flags like
       * `featured` must say so, or the editor shows them pre-ticked.
       */
    | { kind: 'bool'; key: string; label: string; help?: string; defaultOn?: boolean }
    | { kind: 'number'; key: string; label: string; help?: string }
    | { kind: 'date'; key: string; label: string; help?: string }
    | { kind: 'select'; key: string; label: string; options: string[]; help?: string }
    | { kind: 'strings'; key: string; label: string; help?: string; placeholder?: string }
    | {
          kind: 'list';
          key: string;
          label: string;
          help?: string;
          /** Heading shown on each item card. */
          itemTitle: (item: Record<string, unknown>, index: number) => string;
          fields: Field[];
          makeItem: () => Record<string, unknown>;
          /** Hide the add button past this many items (design constraints). */
          max?: number;
      };

export interface SectionSchema {
    key: LandingSectionKey;
    label: string;
    description?: string;
    /** Sections without an `enabled` flag (brand/footer/seo are always rendered). */
    noToggle?: boolean;
    /** Sections with no title/subtitle header in the design. */
    noHeader?: boolean;
    fields: Field[];
}

const ICON_HELP = 'Phosphor icon name, e.g. ph-atom. Browse them at phosphoricons.com.';

export const LANDING_SCHEMA: SectionSchema[] = [
    {
        key: 'brand',
        label: 'Brand & Nav',
        description: 'Your logo, the top navigation links and the header call-to-action.',
        noToggle: true,
        noHeader: true,
        fields: [
            { kind: 'text', key: 'name', label: 'Name (regular)', placeholder: 'LJ', help: 'First half of the wordmark.' },
            { kind: 'text', key: 'nameAccent', label: 'Name (bold)', placeholder: 'Educare', help: 'Second half, shown in bold.' },
            { kind: 'icon', key: 'logoIcon', label: 'Logo icon', help: ICON_HELP },
            { kind: 'image', key: 'logoImage', label: 'Logo image', help: 'Optional. Replaces the icon + wordmark entirely.' },
            { kind: 'text', key: 'ctaLabel', label: 'Button label', placeholder: 'Enroll Now' },
            { kind: 'text', key: 'ctaHref', label: 'Button link', placeholder: '/register' },
            {
                kind: 'list',
                key: 'navLinks',
                label: 'Navigation links',
                help: 'Use #about to jump to a section on this page, or /courses to link elsewhere. Log in and the button are added automatically.',
                itemTitle: (i) => String(i.label || 'Link'),
                makeItem: () => ({ label: '', href: '#' }),
                fields: [
                    { kind: 'text', key: 'label', label: 'Label' },
                    { kind: 'text', key: 'href', label: 'Link' },
                ],
            },
        ],
    },
    {
        key: 'hero',
        label: 'Hero',
        description: 'The first screen: headline, rotating words, social proof and the category tiles.',
        noHeader: true,
        fields: [
            { kind: 'text', key: 'badge', label: 'Badge', placeholder: 'One Institute · Endless Possibilities', wide: true },
            { kind: 'text', key: 'titlePrefix', label: 'Headline start', placeholder: 'Master' },
            { kind: 'strings', key: 'rotatingWords', label: 'Rotating words', help: 'Cycled one at a time in the headline.', placeholder: 'Science' },
            { kind: 'text', key: 'titleAccent', label: 'Headline accent', placeholder: '& 200+ more' },
            { kind: 'text', key: 'titleSuffix', label: 'Headline end', placeholder: 'subjects.' },
            { kind: 'textarea', key: 'subtitle', label: 'Sub-headline', rows: 3 },
            { kind: 'text', key: 'primaryCtaLabel', label: 'Primary button' },
            { kind: 'text', key: 'primaryCtaHref', label: 'Primary button link' },
            { kind: 'text', key: 'secondaryCtaLabel', label: 'Secondary button' },
            { kind: 'text', key: 'secondaryCtaHref', label: 'Secondary button link' },
            { kind: 'image', key: 'image', label: 'Hero image' },
            { kind: 'text', key: 'imageBadge', label: 'Image badge', placeholder: '42 live classes now' },
            { kind: 'bool', key: 'showImageBadge', label: 'Show the image badge' },
            { kind: 'strings', key: 'proofAvatars', label: 'Social-proof avatars', help: 'Image URLs of student faces.' },
            { kind: 'text', key: 'proofMoreLabel', label: 'Avatar overflow label', placeholder: '15k+' },
            { kind: 'text', key: 'proofText', label: 'Social-proof text', wide: true },
            { kind: 'bool', key: 'showProofStars', label: 'Show the 5-star row' },
            { kind: 'text', key: 'floatCardTitle', label: 'Floating card title', placeholder: 'Accredited' },
            { kind: 'text', key: 'floatCardSubtitle', label: 'Floating card subtitle' },
            { kind: 'text', key: 'floatChip1', label: 'Floating chip 1' },
            { kind: 'icon', key: 'floatChip1Icon', label: 'Chip 1 icon', help: ICON_HELP },
            { kind: 'text', key: 'floatChip2', label: 'Floating chip 2' },
            { kind: 'icon', key: 'floatChip2Icon', label: 'Chip 2 icon', help: ICON_HELP },
            {
                kind: 'list',
                key: 'metrics',
                label: 'Headline metrics',
                itemTitle: (i) => `${i.value ?? ''} ${i.label ?? ''}`.trim() || 'Metric',
                makeItem: () => ({ value: '', label: '' }),
                fields: [
                    { kind: 'text', key: 'value', label: 'Value', placeholder: '20+' },
                    { kind: 'text', key: 'label', label: 'Label', placeholder: 'Years' },
                ],
            },
            {
                kind: 'list',
                key: 'categories',
                label: 'Category tiles',
                help: 'The small tiles beside the hero image. Five fit the design best.',
                itemTitle: (i) => String(i.title || 'Category'),
                makeItem: () => ({ icon: 'ph-atom', title: '', subtitle: '', href: '#subjects' }),
                fields: [
                    { kind: 'icon', key: 'icon', label: 'Icon', help: ICON_HELP },
                    { kind: 'text', key: 'title', label: 'Title' },
                    { kind: 'text', key: 'subtitle', label: 'Subtitle' },
                    { kind: 'text', key: 'href', label: 'Link' },
                ],
            },
            {
                kind: 'strings',
                key: 'marqueeWords',
                label: 'Scrolling marquee words',
                help: 'The ticker under the hero. The list is repeated automatically to loop seamlessly.',
            },
        ],
    },
    {
        key: 'trust',
        label: 'Trust Logos',
        description: 'The partner / accreditation logo strip under the hero.',
        noHeader: true,
        fields: [
            { kind: 'text', key: 'text', label: 'Lead-in text', wide: true },
            {
                kind: 'list',
                key: 'logos',
                label: 'Logos',
                itemTitle: (i, n) => String(i.alt || `Logo ${n + 1}`),
                makeItem: () => ({ image: '', alt: '' }),
                fields: [
                    { kind: 'image', key: 'image', label: 'Logo image' },
                    { kind: 'text', key: 'alt', label: 'Alt text', help: 'Describes the logo for screen readers.' },
                ],
            },
        ],
    },
    {
        key: 'founder',
        label: 'Founder',
        description: 'The founder profile block.',
        noHeader: true,
        fields: [
            { kind: 'image', key: 'image', label: 'Portrait' },
            { kind: 'text', key: 'badge', label: 'Portrait badge', placeholder: 'Ph.D. in Education' },
            { kind: 'text', key: 'eyebrow', label: 'Eyebrow', placeholder: 'Meet Our Founder' },
            { kind: 'text', key: 'name', label: 'Name' },
            { kind: 'text', key: 'role', label: 'Role' },
            { kind: 'textarea', key: 'bio', label: 'Bio', rows: 4 },
            { kind: 'text', key: 'ctaLabel', label: 'Button label' },
            { kind: 'text', key: 'ctaHref', label: 'Button link' },
            {
                kind: 'list',
                key: 'achievements',
                label: 'Achievements',
                itemTitle: (i) => String(i.text || 'Achievement'),
                makeItem: () => ({ icon: 'ph-medal', text: '' }),
                fields: [
                    { kind: 'icon', key: 'icon', label: 'Icon', help: ICON_HELP },
                    { kind: 'text', key: 'text', label: 'Text' },
                ],
            },
            {
                kind: 'list',
                key: 'stats',
                label: 'Counters',
                help: 'These count up when scrolled into view, so the value must be a number. Use the suffix for + or %.',
                itemTitle: (i) => String(i.label || 'Counter'),
                makeItem: () => ({ value: 0, suffix: '', label: '' }),
                fields: [
                    { kind: 'number', key: 'value', label: 'Number' },
                    { kind: 'text', key: 'suffix', label: 'Suffix', placeholder: '+' },
                    { kind: 'text', key: 'label', label: 'Label' },
                ],
            },
        ],
    },
    {
        key: 'features',
        label: 'Why Choose Us',
        description: 'The icon grid of selling points.',
        fields: [
            {
                kind: 'list',
                key: 'items',
                label: 'Features',
                itemTitle: (i) => String(i.title || 'Feature'),
                makeItem: () => ({ icon: 'ph-star', title: '', description: '' }),
                fields: [
                    { kind: 'icon', key: 'icon', label: 'Icon', help: ICON_HELP },
                    { kind: 'text', key: 'title', label: 'Title' },
                    { kind: 'textarea', key: 'description', label: 'Description', rows: 2 },
                ],
            },
        ],
    },
    {
        key: 'programs',
        label: 'Learning Paths',
        description: 'The large split program cards.',
        fields: [
            {
                kind: 'list',
                key: 'items',
                label: 'Paths',
                help: 'Two cards fit the design best.',
                itemTitle: (i) => String(i.title || 'Path'),
                makeItem: () => ({ image: '', title: '', description: '', subjects: [], ctaLabel: 'Explore', href: '/categories' }),
                fields: [
                    { kind: 'image', key: 'image', label: 'Image' },
                    { kind: 'text', key: 'title', label: 'Title' },
                    { kind: 'textarea', key: 'description', label: 'Description', rows: 3 },
                    { kind: 'strings', key: 'subjects', label: 'Subject chips' },
                    { kind: 'text', key: 'ctaLabel', label: 'Link label' },
                    { kind: 'text', key: 'href', label: 'Link' },
                ],
            },
        ],
    },
    {
        key: 'subjects',
        label: 'Subjects',
        description: 'The searchable subject grid.',
        fields: [
            { kind: 'bool', key: 'showSearch', label: 'Show the search box', help: 'Searches your live course catalog.' },
            { kind: 'text', key: 'searchPlaceholder', label: 'Search placeholder', wide: true },
            {
                kind: 'strings',
                key: 'chips',
                label: 'Filter chips',
                help: 'The first chip always shows every card. Each of the others reveals the cards tagged with the same word — add the matching tag to each card below.',
            },
            {
                kind: 'list',
                key: 'items',
                label: 'Subject cards',
                itemTitle: (i) => String(i.title || 'Subject'),
                makeItem: () => ({ icon: 'ph-atom', title: '', description: '', href: '/categories', tags: [] }),
                fields: [
                    { kind: 'icon', key: 'icon', label: 'Icon', help: ICON_HELP },
                    { kind: 'text', key: 'title', label: 'Title' },
                    { kind: 'text', key: 'description', label: 'Description' },
                    { kind: 'text', key: 'href', label: 'Link' },
                    {
                        kind: 'strings',
                        key: 'tags',
                        label: 'Filter tags',
                        help: 'Which chips show this card — type them exactly as the chip above. Leave empty to match the chip against this card\'s title and description instead.',
                    },
                ],
            },
        ],
    },
    {
        key: 'faculty',
        label: 'Faculty',
        description: 'The teacher cards. This list is written by hand — it is separate from the teacher accounts in the LMS.',
        fields: [
            {
                kind: 'list',
                key: 'items',
                label: 'Faculty members',
                itemTitle: (i) => String(i.name || 'Member'),
                makeItem: () => ({ image: '', name: '', subject: '', experience: '', featured: false, badge: '', profileHref: '/teachers' }),
                fields: [
                    { kind: 'image', key: 'image', label: 'Photo' },
                    { kind: 'text', key: 'name', label: 'Name' },
                    { kind: 'text', key: 'subject', label: 'Subject / title' },
                    { kind: 'text', key: 'experience', label: 'Experience', placeholder: '15 Years Exp.' },
                    { kind: 'text', key: 'profileHref', label: 'Profile link' },
                    { kind: 'bool', key: 'featured', label: 'Highlight this card', defaultOn: false },
                    { kind: 'text', key: 'badge', label: 'Highlight badge', help: 'Only shown on a highlighted card.' },
                ],
            },
        ],
    },
    {
        key: 'testimonials',
        label: 'Testimonials',
        description: 'Student and parent quotes.',
        fields: [
            {
                kind: 'list',
                key: 'items',
                label: 'Quotes',
                itemTitle: (i) => String(i.name || 'Quote'),
                makeItem: () => ({ quote: '', image: '', name: '', role: '' }),
                fields: [
                    { kind: 'textarea', key: 'quote', label: 'Quote', rows: 3, help: 'Quotation marks are added automatically.' },
                    { kind: 'image', key: 'image', label: 'Photo' },
                    { kind: 'text', key: 'name', label: 'Name' },
                    { kind: 'text', key: 'role', label: 'Role', placeholder: 'Parent of A/L Student' },
                ],
            },
        ],
    },
    {
        key: 'results',
        label: 'Results',
        description: 'The track-record counters.',
        fields: [
            {
                kind: 'list',
                key: 'boxes',
                label: 'Result boxes',
                help: 'Two boxes fit the design best.',
                itemTitle: (i) => String(i.title || 'Box'),
                makeItem: () => ({ icon: 'ph-student', title: '', stats: [] }),
                fields: [
                    { kind: 'icon', key: 'icon', label: 'Icon', help: ICON_HELP },
                    { kind: 'text', key: 'title', label: 'Title' },
                    {
                        kind: 'list',
                        key: 'stats',
                        label: 'Counters',
                        help: 'Values count up on scroll, so they must be numbers. Use the suffix for + or %.',
                        itemTitle: (i) => String(i.label || 'Counter'),
                        makeItem: () => ({ value: 0, suffix: '', label: '' }),
                        fields: [
                            { kind: 'number', key: 'value', label: 'Number' },
                            { kind: 'text', key: 'suffix', label: 'Suffix' },
                            { kind: 'text', key: 'label', label: 'Label' },
                        ],
                    },
                ],
            },
        ],
    },
    {
        key: 'gallery',
        label: 'Gallery',
        description: 'The campus photo masonry.',
        fields: [
            {
                kind: 'list',
                key: 'items',
                label: 'Photos',
                help: 'Mix the sizes for a balanced masonry layout.',
                itemTitle: (i, n) => String(i.caption || `Photo ${n + 1}`),
                makeItem: () => ({ image: '', caption: '', size: 'normal' }),
                fields: [
                    { kind: 'image', key: 'image', label: 'Photo' },
                    { kind: 'text', key: 'caption', label: 'Caption' },
                    { kind: 'select', key: 'size', label: 'Size', options: ['normal', 'tall', 'wide'] },
                ],
            },
        ],
    },
    {
        key: 'recognition',
        label: 'Recognition',
        description: 'The awards timeline.',
        fields: [
            {
                kind: 'list',
                key: 'items',
                label: 'Timeline entries',
                help: 'Shown in this order, alternating left and right.',
                itemTitle: (i) => `${i.year ?? ''} ${i.title ?? ''}`.trim() || 'Entry',
                makeItem: () => ({ year: '', title: '', description: '' }),
                fields: [
                    { kind: 'text', key: 'year', label: 'Year' },
                    { kind: 'text', key: 'title', label: 'Title' },
                    { kind: 'textarea', key: 'description', label: 'Description', rows: 2 },
                ],
            },
        ],
    },
    {
        key: 'events',
        label: 'Events',
        description: 'Upcoming open days, seminars and workshops.',
        fields: [
            {
                kind: 'bool',
                key: 'hidePastEvents',
                label: 'Hide events once their date passes',
                help: 'Recommended — the section keeps itself current without you pruning it.',
            },
            { kind: 'text', key: 'emptyText', label: 'Text when no events remain', wide: true },
            {
                kind: 'list',
                key: 'items',
                label: 'Events',
                itemTitle: (i) => `${i.date ?? ''} — ${i.title ?? ''}`.trim(),
                makeItem: () => ({
                    id: newLandingItemId('evt'),
                    date: '',
                    title: '',
                    time: '',
                    location: '',
                    ctaLabel: 'Register',
                    href: '#contact',
                    enabled: true,
                }),
                fields: [
                    { kind: 'date', key: 'date', label: 'Date' },
                    { kind: 'text', key: 'title', label: 'Title' },
                    { kind: 'text', key: 'time', label: 'Time', placeholder: '09:00 AM - 12:00 PM', help: 'Free text — shown exactly as typed.' },
                    { kind: 'text', key: 'location', label: 'Location' },
                    { kind: 'text', key: 'ctaLabel', label: 'Button label', help: 'Leave empty to hide the button.' },
                    { kind: 'text', key: 'href', label: 'Button link' },
                    { kind: 'bool', key: 'enabled', label: 'Show this event' },
                ],
            },
        ],
    },
    {
        key: 'faq',
        label: 'FAQ',
        description: 'Frequently asked questions. The first one is open by default.',
        fields: [
            {
                kind: 'list',
                key: 'items',
                label: 'Questions',
                itemTitle: (i) => String(i.question || 'Question'),
                makeItem: () => ({ id: newLandingItemId('faq'), question: '', answer: '', enabled: true }),
                fields: [
                    { kind: 'text', key: 'question', label: 'Question' },
                    { kind: 'textarea', key: 'answer', label: 'Answer', rows: 4 },
                    { kind: 'bool', key: 'enabled', label: 'Show this question' },
                ],
            },
        ],
    },
    {
        key: 'contact',
        label: 'Contact',
        description: 'Your contact details, the map and the inquiry form.',
        fields: [
            {
                kind: 'list',
                key: 'items',
                label: 'Contact details',
                itemTitle: (i) => String(i.label || 'Detail'),
                makeItem: () => ({ icon: 'ph-map-pin', label: '', value: '', href: '' }),
                fields: [
                    { kind: 'icon', key: 'icon', label: 'Icon', help: ICON_HELP },
                    { kind: 'text', key: 'label', label: 'Label', placeholder: 'Call Us' },
                    { kind: 'text', key: 'value', label: 'Value', placeholder: '+94 77 123 4567' },
                    { kind: 'text', key: 'href', label: 'Link', help: 'Optional. Use tel:+94771234567 or mailto:you@school.lk to make it clickable.' },
                ],
            },
            {
                kind: 'text',
                key: 'mapEmbedUrl',
                label: 'Map embed URL',
                wide: true,
                help: 'From Google Maps → Share → Embed a map, copy the src="…" URL. Takes priority over the map image.',
            },
            { kind: 'image', key: 'mapImage', label: 'Map image', help: 'Used only when there is no embed URL.' },
            { kind: 'bool', key: 'showForm', label: 'Show the inquiry form' },
            { kind: 'text', key: 'formTitle', label: 'Form title' },
            { kind: 'strings', key: 'programOptions', label: '"Program of Interest" options' },
            { kind: 'text', key: 'submitLabel', label: 'Submit button label' },
            { kind: 'textarea', key: 'successMessage', label: 'Message after sending', rows: 2 },
        ],
    },
    {
        key: 'footer',
        label: 'Footer',
        description: 'Footer blurb, social links, link columns and the newsletter box.',
        noToggle: true,
        noHeader: true,
        fields: [
            { kind: 'textarea', key: 'description', label: 'Blurb', rows: 3 },
            { kind: 'bool', key: 'showNewsletter', label: 'Show the newsletter box' },
            { kind: 'text', key: 'newsletterTitle', label: 'Newsletter title' },
            { kind: 'text', key: 'newsletterText', label: 'Newsletter text' },
            { kind: 'text', key: 'newsletterSuccessMessage', label: 'Newsletter thank-you' },
            { kind: 'text', key: 'copyright', label: 'Copyright', wide: true, help: 'Use {year} to insert the current year automatically.' },
            {
                kind: 'list',
                key: 'socialLinks',
                label: 'Social links',
                itemTitle: (i) => String(i.label || 'Social'),
                makeItem: () => ({ icon: 'ph-facebook-logo', href: '', label: '' }),
                fields: [
                    { kind: 'icon', key: 'icon', label: 'Icon', help: ICON_HELP },
                    { kind: 'text', key: 'href', label: 'Link' },
                    { kind: 'text', key: 'label', label: 'Name', help: 'Used as the screen-reader label.' },
                ],
            },
            {
                kind: 'list',
                key: 'columns',
                label: 'Link columns',
                itemTitle: (i) => String(i.title || 'Column'),
                makeItem: () => ({ title: '', links: [] }),
                fields: [
                    { kind: 'text', key: 'title', label: 'Column title' },
                    {
                        kind: 'list',
                        key: 'links',
                        label: 'Links',
                        itemTitle: (i) => String(i.label || 'Link'),
                        makeItem: () => ({ label: '', href: '' }),
                        fields: [
                            { kind: 'text', key: 'label', label: 'Label' },
                            { kind: 'text', key: 'href', label: 'Link' },
                        ],
                    },
                ],
            },
            {
                kind: 'list',
                key: 'legalLinks',
                label: 'Legal links',
                itemTitle: (i) => String(i.label || 'Link'),
                makeItem: () => ({ label: '', href: '' }),
                fields: [
                    { kind: 'text', key: 'label', label: 'Label' },
                    { kind: 'text', key: 'href', label: 'Link' },
                ],
            },
        ],
    },
    {
        key: 'seo',
        label: 'SEO',
        description: 'What search engines and social previews show for this page.',
        noToggle: true,
        noHeader: true,
        fields: [
            { kind: 'text', key: 'title', label: 'Page title', wide: true, help: 'Leave empty to use your site name.' },
            { kind: 'textarea', key: 'description', label: 'Meta description', rows: 3, help: 'Around 150–160 characters works best.' },
            { kind: 'image', key: 'shareImage', label: 'Social share image', help: '1200×630 is the standard size.' },
        ],
    },
];
