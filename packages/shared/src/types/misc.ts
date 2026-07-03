export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface ActivityLog {
    id: string;
    action: string;              // e.g. 'CREATE_COURSE', 'PAY_TEACHER'
    params?: Record<string, unknown>;
    performedBy: string;         // uid | 'SYSTEM' | 'GUEST'
    performedByName?: string;
    userRole?: string;
    timestamp: string;           // ISO
    level: 'INFO' | 'WARN' | 'ERROR';
}

export interface AppNotification {
    id: string;
    teacherId: string;
    teacherName: string;
    teacherAvatar: string;
    content: string;
    target: 'all_students' | { type: 'class'; classId: string; className: string };
    createdAt: string;           // ISO
    recipientCount: number;
}

export type RequestStatus =
    | 'pending'
    | 'accepted'
    | 'change_requested'
    | 'paid'
    | 'scheduled'
    | 'rejected'
    | 'expired';

export interface CustomClassRequest {
    id: string;
    studentId: string;
    teacherId: string;
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    topic: string;
    message: string;
    requestedSlots: {
        date: string;            // YYYY-MM-DD
        startTime: string;       // HH:mm
        endTime: string;
        durationMinutes: number;
    }[];
    ratesSnapshot: { hourly: number };
    totalCost: number;           // LKR
    status: RequestStatus;
    negotiationHistory: {
        sender: 'teacher' | 'student';
        message?: string;
        proposedCost?: number;
        timestamp: string;
    }[];
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
}

/** kiosk_devices/{id} — a paired attendance-scanner device. */
export interface KioskDevice {
    id: string;
    label: string;               // e.g. "Front desk tablet"
    pairedAt?: string;           // ISO
    pairedUid?: string;          // the kiosk-role auth user
    pairingCode?: string;        // one-time code (cleared after pairing)
    pairingCodeExpiresAt?: string;
    isActive: boolean;
    createdBy: string;           // admin uid
}
