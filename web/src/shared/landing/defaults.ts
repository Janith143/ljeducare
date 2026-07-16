import type { LandingSettings } from '../types/landing';

/**
 * The landing page as originally authored in the standalone landingpage/index.html.
 *
 * `getLandingSettings()` deep-merges the stored settings/landing doc over this, so:
 *   - a fresh install renders the designed page rather than an empty shell, and
 *   - the admin CMS opens pre-filled and editable instead of blank.
 *
 * Anything an admin saves wins. Fields left untouched keep falling back here.
 */
export const DEFAULT_LANDING: LandingSettings = {
    brand: {
        name: 'LJ',
        nameAccent: 'Educare',
        logoIcon: 'ph-graduation-cap',
        logoImage: '',
        navLinks: [
            { label: 'About', href: '#about' },
            { label: 'Programs', href: '#programs' },
            { label: 'Faculty', href: '#faculty' },
            { label: 'Achievements', href: '#achievements' },
            { label: 'Contact', href: '#contact' },
        ],
        ctaLabel: 'Enroll Now',
        ctaHref: '/register',
    },

    hero: {
        enabled: true,
        badge: 'One Institute · Endless Possibilities',
        titlePrefix: 'Master',
        rotatingWords: ['Science', 'Coding', 'Business', 'Design', 'Medicine', 'Music', 'Languages', 'Engineering'],
        titleAccent: '& 200+ more',
        titleSuffix: 'subjects.',
        subtitle:
            'From O/L & A/L to professional diplomas and corporate training — expert-led programs across every discipline, online & on-campus.',
        primaryCtaLabel: 'Explore Programs',
        primaryCtaHref: '#programs',
        secondaryCtaLabel: 'Meet Our Founder',
        secondaryCtaHref: '#founder',
        proofAvatars: [
            'https://randomuser.me/api/portraits/women/44.jpg',
            'https://randomuser.me/api/portraits/men/32.jpg',
            'https://randomuser.me/api/portraits/women/68.jpg',
            'https://randomuser.me/api/portraits/men/75.jpg',
        ],
        proofMoreLabel: '15k+',
        proofText: 'Loved by 15,000+ students & parents',
        showProofStars: true,
        metrics: [
            { value: '20+', label: 'Years' },
            { value: '200+', label: 'Courses' },
            { value: '95%', label: 'Success rate' },
        ],
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop',
        imageBadge: '42 live classes now',
        showImageBadge: true,
        categories: [
            { icon: 'ph-code', title: 'IT & Coding', subtitle: 'Python · AI · Cyber', href: '#subjects' },
            { icon: 'ph-chart-line-up', title: 'Business', subtitle: 'Accounting · MBA', href: '#subjects' },
            { icon: 'ph-atom', title: 'Science', subtitle: 'Physics · Bio · Chem', href: '#subjects' },
            { icon: 'ph-palette', title: 'Design & Arts', subtitle: 'Graphic · UI/UX', href: '#subjects' },
            { icon: 'ph-translate', title: 'Languages', subtitle: 'IELTS · Spoken', href: '#subjects' },
        ],
        floatCardTitle: 'Accredited',
        floatCardSubtitle: 'Globally recognized',
        floatChip1: 'Medicine',
        floatChip1Icon: 'ph-first-aid-kit',
        floatChip2: 'Music',
        floatChip2Icon: 'ph-music-notes',
        marqueeWords: [
            'Physics', 'Accounting', 'Python', 'IELTS', 'Graphic Design', 'Piano', 'Pharmacology',
            'Civil Engineering', 'Digital Marketing', 'Chemistry', 'Data Science', 'Spoken English',
            'Economics', 'Mechanical', 'UI / UX',
        ],
    },

    trust: {
        enabled: true,
        text: 'Trusted by leading educational bodies and organizations',
        logos: [
            { image: 'https://placehold.co/150x50/f8f9fa/64748B?text=University+Logo', alt: 'University' },
            { image: 'https://placehold.co/150x50/f8f9fa/64748B?text=Corporate+Partner', alt: 'Corporate Partner' },
            { image: 'https://placehold.co/150x50/f8f9fa/64748B?text=EdTech+Corp', alt: 'EdTech Corp' },
            { image: 'https://placehold.co/150x50/f8f9fa/64748B?text=Global+Academy', alt: 'Global Academy' },
            { image: 'https://placehold.co/150x50/f8f9fa/64748B?text=Pro+Institute', alt: 'Pro Institute' },
        ],
    },

    founder: {
        enabled: true,
        image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop',
        badge: 'Ph.D. in Education',
        eyebrow: 'Meet Our Founder',
        name: 'Dr. Robert Sterling',
        role: 'Founder & Academic Director',
        bio: 'With over 25 years of experience in global education, Dr. Sterling has revolutionized the way students approach learning. His vision integrates traditional academic rigor with modern, practical skill-building.',
        achievements: [
            { icon: 'ph-medal', text: 'Global Education Award 2023' },
            { icon: 'ph-chalkboard-teacher', text: 'Former Harvard Guest Lecturer' },
            { icon: 'ph-book-open', text: 'Author of "Future of Learning"' },
        ],
        stats: [
            { value: 25, suffix: '', label: 'Years Experience' },
            { value: 100, suffix: '+', label: 'Seminars Given' },
        ],
        ctaLabel: 'Read Full Story',
        ctaHref: '#about',
    },

    features: {
        enabled: true,
        title: 'Why Choose Us',
        subtitle:
            'We provide a premium educational experience that bridges the gap between academic theory and industry reality.',
        items: [
            { icon: 'ph-chalkboard-teacher', title: 'Experienced Faculty', description: 'Learn from industry experts and renowned academics dedicated to your success.' },
            { icon: 'ph-briefcase', title: 'Industry Experts', description: 'Curriculum designed in collaboration with top corporate leaders.' },
            { icon: 'ph-compass', title: 'Career Guidance', description: 'Personalized mentorship to help you navigate your professional journey.' },
            { icon: 'ph-desktop', title: 'Modern Teaching', description: 'State-of-the-art facilities with interactive and engaging methodologies.' },
            { icon: 'ph-laptop', title: 'Physical + Online', description: 'Flexible hybrid learning models adapted to your lifestyle.' },
            { icon: 'ph-flask', title: 'Practical Learning', description: 'Hands-on projects and real-world case studies in every course.' },
        ],
    },

    programs: {
        enabled: true,
        title: 'Choose Your Learning Path',
        subtitle: 'Discover customized programs tailored to different stages of your educational journey.',
        items: [
            {
                image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop',
                title: 'School Education',
                description: 'Comprehensive foundation for O/L and A/L students aiming for academic excellence and top university admissions.',
                subjects: ['Science', 'Mathematics', 'Languages', 'Commerce'],
                ctaLabel: 'Explore School Programs',
                href: '/categories',
            },
            {
                image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
                title: 'Professional Education',
                description: 'Advanced certifications, diplomas, and corporate training for adults and working professionals.',
                subjects: ['Business & IT', 'Engineering', 'Accounting', 'Digital Marketing'],
                ctaLabel: 'Explore Professional Programs',
                href: '/categories',
            },
        ],
    },

    subjects: {
        enabled: true,
        title: 'Explore Subjects',
        subtitle: 'Find the perfect course from our extensive range of disciplines.',
        showSearch: true,
        searchPlaceholder: 'Search for courses, subjects, or skills...',
        chips: ['All', 'Science', 'Business', 'IT', 'Engineering', 'Accounting', 'English', 'Digital Marketing'],
        // `tags` decide which chip above reveals each card — keep them in sync with `chips`.
        items: [
            { icon: 'ph-atom', title: 'Science & Math', description: 'Physics, Chemistry, Biology, Advanced Mathematics', href: '/categories', tags: ['Science'] },
            { icon: 'ph-chart-line-up', title: 'Business & Finance', description: 'Accounting, Economics, Business Studies, MBA Prep', href: '/categories', tags: ['Business', 'Accounting'] },
            { icon: 'ph-code', title: 'Information Technology', description: 'Programming, AI, Cyber Security, Software Eng.', href: '/categories', tags: ['IT'] },
            { icon: 'ph-wrench', title: 'Engineering', description: 'Civil, Mechanical, Electrical, Auto CAD', href: '/categories', tags: ['Engineering'] },
            { icon: 'ph-translate', title: 'Languages', description: 'Spoken English, IELTS, French, Japanese', href: '/categories', tags: ['English'] },
            { icon: 'ph-megaphone', title: 'Digital Marketing', description: 'SEO, Social Media, Content Marketing', href: '/categories', tags: ['Digital Marketing'] },
        ],
    },

    faculty: {
        enabled: true,
        title: 'Learn From The Best',
        subtitle: 'Our faculty consists of industry leaders, experienced professors, and dedicated mentors.',
        items: [
            {
                image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop',
                name: 'Dr. Robert Sterling',
                subject: 'Ph.D. in Education',
                experience: '25+ Years Exp.',
                featured: true,
                badge: 'Founder & Director',
                profileHref: '/teachers',
            },
            {
                image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop',
                name: 'Prof. Sarah Jenkins',
                subject: 'Head of Sciences',
                experience: '15 Years Exp.',
                featured: false,
                badge: '',
                profileHref: '/teachers',
            },
            {
                image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1974&auto=format&fit=crop',
                name: 'Mr. David Chen',
                subject: 'IT & AI Expert',
                experience: '10 Years Exp.',
                featured: false,
                badge: '',
                profileHref: '/teachers',
            },
            {
                image: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?q=80&w=2070&auto=format&fit=crop',
                name: 'Dr. Emily Thorne',
                subject: 'Business Strategy',
                experience: '18 Years Exp.',
                featured: false,
                badge: '',
                profileHref: '/teachers',
            },
        ],
    },

    testimonials: {
        enabled: true,
        title: 'Success Stories',
        subtitle: 'Hear from our students and parents about their transformative journeys.',
        items: [
            {
                quote: 'The practical approach to learning and the incredible mentorship from the faculty helped me secure my dream job right after graduation.',
                image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1974&auto=format&fit=crop',
                name: 'Michael R.',
                role: 'Software Engineer',
            },
            {
                quote: "As a parent, I couldn't be happier. The balanced focus on academics and personal growth has completely transformed my daughter's confidence.",
                image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1976&auto=format&fit=crop',
                name: 'Sarah W.',
                role: 'Parent of A/L Student',
            },
            {
                quote: 'The professional certification courses are top-notch. The flexible schedule allowed me to upskill without leaving my full-time job.',
                image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop',
                name: 'James T.',
                role: 'Marketing Director',
            },
        ],
    },

    results: {
        enabled: true,
        title: 'Our Proven Track Record',
        subtitle: 'Numbers speak louder than words. We consistently produce top achievers across all disciplines.',
        boxes: [
            {
                icon: 'ph-student',
                title: 'School Achievements',
                stats: [
                    { value: 120, suffix: '', label: 'Island Rankers' },
                    { value: 450, suffix: '', label: "9A's in O/L" },
                    { value: 300, suffix: '', label: 'University Admissions' },
                ],
            },
            {
                icon: 'ph-briefcase',
                title: 'Professional Achievements',
                stats: [
                    { value: 85, suffix: '%', label: 'Got Promoted' },
                    { value: 5000, suffix: '+', label: 'Certified Professionals' },
                    { value: 98, suffix: '%', label: 'Pass Rate' },
                ],
            },
        ],
    },

    gallery: {
        enabled: true,
        title: 'Gallery',
        subtitle: 'Experience a vibrant, engaging, and inspiring environment.',
        items: [
            { image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop', caption: 'Collaborative Learning', size: 'tall' },
            { image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop', caption: 'Modern Labs', size: 'normal' },
            { image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop', caption: 'Annual Events', size: 'wide' },
            { image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop', caption: 'Interactive Seminars', size: 'normal' },
            { image: 'https://images.unsplash.com/photo-1523580494112-071d384e2095?q=80&w=2070&auto=format&fit=crop', caption: 'Graduation Day', size: 'tall' },
        ],
    },

    recognition: {
        enabled: true,
        title: 'Industry Recognition',
        subtitle: 'Our commitment to excellence is recognized globally.',
        items: [
            { year: '2024', title: 'Best EdTech Integration', description: 'Awarded by the National Education Board for pioneering hybrid learning methods.' },
            { year: '2022', title: 'ISO 9001:2015 Certification', description: 'Recognized for maintaining high-quality management systems in educational delivery.' },
            { year: '2019', title: 'Excellence in Professional Training', description: 'Global Corporate Awards recognized our adult learning and corporate training programs.' },
            { year: '2015', title: 'Top 10 Institutes', description: 'Ranked among the top 10 educational institutes in the region for academic outcomes.' },
        ],
    },

    events: {
        enabled: true,
        title: 'Upcoming Events',
        subtitle: 'Join our open days, seminars, and workshops to discover more.',
        hidePastEvents: true,
        emptyText: 'No events scheduled right now — check back soon.',
        items: [
            { id: 'evt-1', date: '2026-08-15', title: 'Future Leaders Seminar', time: '09:00 AM - 12:00 PM', location: 'Main Auditorium', ctaLabel: 'Register', href: '#contact', enabled: true },
            { id: 'evt-2', date: '2026-08-22', title: 'Tech Innovation Workshop', time: '01:00 PM - 04:00 PM', location: 'IT Lab Center', ctaLabel: 'Register', href: '#contact', enabled: true },
            { id: 'evt-3', date: '2026-09-05', title: 'University Admissions Open Day', time: '10:00 AM - 05:00 PM', location: 'Campus Grounds', ctaLabel: 'Register', href: '#contact', enabled: true },
        ],
    },

    faq: {
        enabled: true,
        title: 'Frequently Asked Questions',
        subtitle: 'Find answers to common queries about our programs and admissions.',
        items: [
            { id: 'faq-1', question: 'What is the admission process?', answer: "Our admission process starts with an online application, followed by an entrance evaluation for specific courses, and a final interview. You can begin by clicking 'Enroll Now' at the top of the page.", enabled: true },
            { id: 'faq-2', question: 'Do you offer online classes?', answer: 'Yes, we offer fully online and hybrid models for most of our professional and school education programs to provide maximum flexibility.', enabled: true },
            { id: 'faq-3', question: 'Are your certificates internationally recognized?', answer: 'Absolutely. Our professional diplomas and certificates are accredited by leading global bodies, ensuring your qualifications are recognized worldwide.', enabled: true },
            { id: 'faq-4', question: 'Is financial aid available?', answer: 'We provide various scholarships and flexible payment plans based on merit and financial need. Please contact our admissions office for detailed information.', enabled: true },
        ],
    },

    contact: {
        enabled: true,
        title: 'Get In Touch',
        subtitle: 'Have questions? We are here to help you take the next step.',
        items: [
            { icon: 'ph-map-pin', label: 'Visit Us', value: '123 Education Boulevard, Knowledge City', href: '' },
            { icon: 'ph-phone', label: 'Call Us', value: '+1 234 567 8900', href: 'tel:+12345678900' },
            { icon: 'ph-envelope-simple', label: 'Email Us', value: 'admissions@eduelite.edu', href: 'mailto:admissions@eduelite.edu' },
        ],
        mapEmbedUrl: '',
        mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074&auto=format&fit=crop',
        showForm: true,
        formTitle: 'Send us a message',
        programOptions: [
            'School Education (O/L, A/L)',
            'Professional Certification',
            'Corporate Training',
            'Other',
        ],
        submitLabel: 'Submit Inquiry',
        successMessage: "Thank you — we've received your message and will get back to you shortly.",
    },

    footer: {
        description:
            'Building School Achievers, Future Professionals, and Industry Leaders with world-class education.',
        socialLinks: [
            { icon: 'ph-facebook-logo', href: '#', label: 'Facebook' },
            { icon: 'ph-twitter-logo', href: '#', label: 'Twitter' },
            { icon: 'ph-instagram-logo', href: '#', label: 'Instagram' },
            { icon: 'ph-linkedin-logo', href: '#', label: 'LinkedIn' },
        ],
        columns: [
            {
                title: 'Quick Links',
                links: [
                    { label: 'About Us', href: '#about' },
                    { label: 'Founder', href: '#founder' },
                    { label: 'Faculty', href: '#faculty' },
                    { label: 'Achievements', href: '#achievements' },
                    { label: 'FAQ', href: '#faq' },
                ],
            },
            {
                title: 'Programs',
                links: [
                    { label: 'School Education', href: '/categories' },
                    { label: 'Professional Diplomas', href: '/courses' },
                    { label: 'IT & Tech', href: '/categories' },
                    { label: 'Business & Management', href: '/categories' },
                    { label: 'Corporate Training', href: '/contact' },
                ],
            },
        ],
        showNewsletter: true,
        newsletterTitle: 'Newsletter',
        newsletterText: 'Subscribe to get the latest news and updates.',
        newsletterSuccessMessage: "You're subscribed — thanks!",
        copyright: '© {year} LJ Educare. All rights reserved.',
        legalLinks: [
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
        ],
    },

    seo: {
        title: '',
        description:
            'Premium Educational Institute — Building School Achievers, Future Professionals, and Industry Leaders.',
        shareImage: '',
    },
};
