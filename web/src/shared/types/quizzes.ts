import type { Pricing } from '../money/types';

export interface Answer {
    id: string;
    text: string;
    isCorrect: boolean;
}

export interface Question {
    id: string;
    text: string;
    imageUrl?: string;
    answers: Answer[];
}

/** quizzes/{id} — a timed online quiz. */
export interface Quiz {
    id: string;
    teacherId: string;
    title: string;
    slug: string;
    description: string;
    subject: string;
    date: string;              // YYYY-MM-DD
    startTime: string;         // HH:MM
    durationMinutes: number;
    pricing: Pricing;
    questions: Question[];
    status: 'scheduled' | 'finished' | 'canceled';
    isPublished: boolean;
    isDeleted?: boolean;
    instanceStartDate?: string;
    medium?: string;
    grade?: string;
    attachedToClassId?: string;
    category?: string;         // display name (legacy free-text)
    categorySlug?: string;     // reference to categories/{slug}
    createdAt?: string;
}

/** submissions/{id} — a student's quiz attempt (server-only writes). */
export interface StudentSubmission {
    id: string;
    studentId: string;
    quizId: string;
    answers: { questionId: string; selectedAnswerIds: string[] }[];
    score: number;
    submittedAt: string;       // ISO
    quizInstanceId?: string;
}

export interface StudentResult {
    studentId: string;
    studentName: string;
    studentAvatar: string;
    score: number;
    timeTakenSeconds: number;
}
