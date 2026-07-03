import type { Address } from './base';
import type { Role } from '../permissions/roles';
import type { Permission } from '../permissions/permissions';
import type { CurrencyCode } from '../money/types';

export interface UserNotification {
    notificationId: string;
    isRead: boolean;
}

/**
 * users/{uid} document. Role/permissions here are MIRRORED into custom claims by
 * the auth-security function — the doc fields are for display, claims are for authz.
 */
export interface User {
    id: string;
    uid?: string;
    firstName: string;
    lastName: string;
    email: string;
    username?: string;              // login username (immutable once set)
    role: Role;
    permissions?: Permission[];     // delegated subset for manager/teacher_admin
    avatar: string;
    contactNumber?: string;
    guardianEmail?: string;         // guardian attendance alerts
    guardianPhone?: string;
    address?: Address;
    status: 'active' | 'pending' | 'suspended';
    /** Staff doc id when role is teacher/teacher_admin. */
    staffId?: string;
    enrolledCourseIds?: string[];
    enrolledClassIds?: string[];
    enrolledQuizIds?: string[];
    preferredCurrency?: CurrencyCode;
    preferredLanguage?: 'Sinhala' | 'English' | 'Tamil';
    isEmailVerified?: boolean;
    isMobileVerified?: boolean;
    watchHistory?: { [courseId: string]: { [lectureId: string]: boolean } };
    /** Per-recording play counts keyed `${classId}_${instanceDate}` (view-cap enforcement). */
    recordingViews?: { [key: string]: number };
    notifications?: UserNotification[];
    gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    dateOfBirth?: string;           // YYYY-MM-DD
    schools?: string[];
    targetAudience?: string;
    createdAt?: string;
    registrationSource?: string;
}
