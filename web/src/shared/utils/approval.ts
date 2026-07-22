/**
 * Admin approval workflow for teacher-created content.
 *
 * A teacher can no longer publish straight to the public site: they submit, an admin
 * with the `content` permission approves, and approval is what makes it publishable.
 * Once approved the teacher controls visibility freely (publish/unpublish) — approval
 * is a one-time gate, not a per-publish checkpoint.
 *
 *   not_requested ──submit──> pending ──approve──> approved ──> teacher may publish
 *         ^                      │
 *         └──withdraw────────────┤
 *                                └──reject──> rejected ──(edit + resubmit)──> pending
 */
export type ApprovalStatus = 'not_requested' | 'pending' | 'approved' | 'rejected';

/** Treat a missing/unknown value as a fresh draft rather than throwing. */
export function approvalOf(value: unknown): ApprovalStatus {
    return value === 'pending' || value === 'approved' || value === 'rejected' ? value : 'not_requested';
}

export const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
    not_requested: 'Draft',
    pending: 'Awaiting approval',
    approved: 'Approved',
    rejected: 'Changes requested',
};

/** Tailwind classes for the status pill, shared by the teacher and admin tables. */
export const APPROVAL_STYLE: Record<ApprovalStatus, string> = {
    not_requested: 'bg-light-background text-light-subtle dark:bg-dark-background dark:text-dark-subtle',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

/** Only approved content may go live. */
export function canPublish(status: unknown): boolean {
    return approvalOf(status) === 'approved';
}

/** A teacher may (re)submit from a draft or after changes were requested. */
export function canSubmit(status: unknown): boolean {
    const s = approvalOf(status);
    return s === 'not_requested' || s === 'rejected';
}
