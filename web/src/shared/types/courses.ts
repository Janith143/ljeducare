import type { Pricing } from '../money/types';

export interface Lecture {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    resourcesUrl?: string;
    durationMinutes: number;
    isFreePreview: boolean;
}

export interface LiveSession {
    id: string;
    title: string;
    description?: string;
    date: string;        // YYYY-MM-DD
    startTime: string;   // HH:MM
    endTime: string;     // HH:MM
    resourceLink?: string;
    joinLink?: string;
    recordingLink?: string;
    status: 'scheduled' | 'live' | 'finished';
}

export interface CourseRating {
    studentId: string;
    rating: number;      // 1–5
    ratedAt: string;     // ISO
}

export type CourseType = 'recorded' | 'live';
export type PaymentPlan = 'full' | 'monthly' | 'per_session' | 'installments_2';

/** courses/{id} — a self-paced (recorded) or scheduled (live) course. */
export interface Course {
    id: string;
    teacherId: string;
    title: string;
    slug: string;
    description: string;
    subject: string;
    coverImage: string;
    pricing: Pricing;
    type: CourseType;
    paymentPlans?: PaymentPlan[];
    lectures: Lecture[];             // type 'recorded'
    liveSessions?: LiveSession[];    // type 'live'
    scheduleConfig?: {
        startDate: string;
        startTime: string;
        durationMinutes: number;
        weekCount: number;
        days: number[];              // 0=Sun … 6=Sat
    };
    isPublished: boolean;
    adminApproval: 'not_requested' | 'pending' | 'approved' | 'rejected';
    ratings: CourseRating[];
    isDeleted?: boolean;
    medium?: string;
    grade?: string;
    category?: string;         // display name (legacy free-text)
    categorySlug?: string;     // reference to categories/{slug}
    createdAt?: string;
}

/** certificates/{id} — course-completion certificate (server-only writes). */
export interface Certificate {
    id: string;
    studentId: string;
    studentName: string;
    teacherId: string;
    teacherName: string;
    itemId: string;         // course id
    itemType: 'course';
    itemTitle: string;
    issuedAt: string;       // ISO
    pdfUrl: string;
    verificationId: string; // public /verify/[verificationId]
}
