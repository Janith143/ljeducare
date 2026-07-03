export enum Theme {
    Light = 'light',
    Dark = 'dark',
}

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface Address {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

export type Recurrence = 'none' | 'weekly' | 'flexible';

export type StaticPageKey =
    | 'about_us'
    | 'contact_support'
    | 'faq'
    | 'student_terms'
    | 'privacy_policy'
    | 'refund_policy'
    | 'disclaimer';

export interface ContactInfo {
    phone: string;
    email: string;
    location: string;
    onlineAvailable: boolean;
}

export interface TimeTableEntry {
    classId: string;
    day: string;
    subject: string;
    title: string;
    startTime: string;
    endTime: string;
}

export interface HomeSlide {
    image: string;
    title: string;
    subtitle: string;
    ctaText: string;
    ctaHref?: string;
}
