import type { Pricing } from '../money/types';
import type { Recurrence } from './base';
import type { ExamResult } from './exams';

export interface AttendanceRecord {
    studentId: string;
    studentName: string;
    studentAvatar: string;
    attendedAt: string;                      // ISO
    paymentStatus: 'paid' | 'unpaid' | 'paid_at_venue';
    paymentRef?: string;                     // saleId
    enrollmentStatus?: 'enrolled' | 'new_enrollment';
    markedBy?: string;                       // kiosk device id or staff uid
}

export interface StudentScore {
    studentId: string;
    score: number;
}

export interface ClassGrading {
    maxMark: number;
    studentScores: StudentScore[];
}

export interface HomeworkSubmission {
    studentId: string;
    link: string;
    submittedAt: string; // ISO
}

/** classes/{id} — a live class (one-off, weekly, or flexible schedule). */
export interface LiveClass {
    id: string;
    teacherId: string;
    title: string;
    slug: string;
    subject: string;
    description: string;
    date: string;              // YYYY-MM-DD (first/next session)
    startTime: string;         // HH:MM
    endTime: string;           // HH:MM
    pricing: Pricing;
    targetAudience: string;
    mode: 'Online' | 'Physical' | 'Both';
    joiningLink?: string;
    /** Simulated-live: pre-recorded video played clock-synced at start time. */
    liveMode?: 'simulated';
    simulatedVideoUrl?: string;         // enrolled-only, never in public payloads
    meetProvider?: 'google' | 'zoom';
    zoomMeetingId?: string;
    zoomStartUrl?: string;
    googleEventId?: string;
    /** Emergency backup join link (teacher-managed, auto-resets weekly). */
    fallbackJoinLink?: string;
    fallbackJoinEnabled?: boolean;
    documentLink?: string;
    recordingUrls?: { [date: string]: string[] };
    recordingExpiryDays?: number;       // 14/30/60, 0 = never (default 60)
    recordingMaxViews?: number;         // 0/undefined = unlimited
    grades?: { [instanceDate: string]: ClassGrading };
    examResults?: ExamResult[];
    examCategories?: string[];
    homeworkSubmissions?: { [instanceDate: string]: HomeworkSubmission[] };
    recurrence: Recurrence;
    weeklyPaymentOption?: 'per_session' | 'per_month';
    flexibleDates?: { date: string; startTime: string; endTime: string }[];
    endDate?: string;
    status: 'scheduled' | 'finished' | 'canceled';
    isPublished: boolean;
    adminApproval: 'not_requested' | 'pending' | 'approved' | 'rejected';
    hidePrice?: boolean;
    /** Enrollment free until this ISO timestamp ("make next session free"). */
    freeUntil?: string;
    isDeleted?: boolean;
    attendance?: AttendanceRecord[];
    instanceStartDate?: string;
    medium?: string;
    grade?: string;
    lastSessionFinishedAt?: string;
    attachedQuizId?: string;
    category?: string;
    parentClassId?: string;    // ad-hoc extra session → source class
    createdAt?: string;
}
