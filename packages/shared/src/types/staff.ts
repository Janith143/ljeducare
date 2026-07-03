import type { ContactInfo, TimeTableEntry } from './base';
import type { VerificationStatus } from './misc';

export interface TeachingItem {
    id: string;
    audience: string;
    subject: string;
    mediums: string[];   // 'Sinhala' | 'Tamil' | 'English'
    grades: string[];    // 'Grade 1' … 'Revision'
}

/**
 * staff/{id} — a teacher employed by the institute.
 * Replaces the source teachers/managed_teachers/tuitionInstitutes triad.
 */
export interface StaffMember {
    id: string;
    /** Auth uid of the linked user account (role teacher/teacher_admin). */
    userId?: string;
    name: string;
    slug: string;                    // public bio page /teachers/[slug]
    email: string;
    profileImage: string;
    avatar: string;
    coverImages?: string[];
    tagline: string;
    bio: string;
    subjects: string[];              // simple searchable list
    teachingItems?: TeachingItem[];  // structured detail
    exams?: string[];
    qualifications?: string[];
    languages?: string[];
    experienceYears?: number;
    achievements?: string[];
    contact?: ContactInfo;
    timetable?: TimeTableEntry[];

    /** % of each sale's baseAmount credited to this teacher (0–100). */
    commissionRate: number;
    /** Cash collected at venue on this teacher's behalf, owed by/to institute (LKR). */
    manualBalance?: number;
    /** ISO timestamp of the last Pay & Reset settlement. */
    lastReset?: string;
    /** Lifetime commission earned (LKR, reporting only). */
    totalEarned?: number;

    idVerificationStatus?: VerificationStatus;
    isPublished?: boolean;           // show on public /teachers pages
    isDeleted?: boolean;
    createdAt?: string;

    // Zoom / Google Meet integration (server-managed tokens live in a private subcollection)
    zoomAccountConnected?: boolean;
    zoomEmail?: string;
    zoomAutoRecordEnabled?: boolean;
    googleMeetConnected?: boolean;
}

/** teacher_payments/{id} — Pay & Reset settlement log entry (server-only writes). */
export interface TeacherPayment {
    id: string;
    teacherId: string;
    teacherName: string;
    amountPaid: number;              // LKR
    manualPortion?: number;          // LKR from cash balance
    commissionPortion?: number;      // LKR from online commission
    paidAt: string;                  // ISO
    paidBy: string;                  // admin uid
    note?: string;
}
