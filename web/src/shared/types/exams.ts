import type { StudentScore } from './classes';

/**
 * A categorized exam/assessment attached to a class. A class can hold many
 * ExamResults across teacher-defined categories (e.g. "Model Papers").
 */
export interface ExamResult {
    id: string;
    name: string;          // e.g. "March Model Paper"
    category: string;      // teacher-defined label
    date: string;          // YYYY-MM-DD
    maxMark: number;
    studentScores: StudentScore[];
    feedback?: { [studentId: string]: string };
    createdAt?: string;    // ISO
}

export interface UpcomingExam {
    id: string;
    name: string;
    date: string;          // YYYY-MM-DD
    targetAudience: string;
    isHighPriority: boolean;
}
