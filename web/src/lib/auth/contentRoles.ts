import 'server-only';

/**
 * Who may create and manage classes/courses.
 *
 * Admins and managers act as "staff at large": they oversee everyone's content, but
 * they have no staff profile of their own, so they must nominate the teacher a new
 * item belongs to — otherwise it would be orphaned (no teacher byline, and invisible
 * to the suspend/delete cascade in lib/data/teacherCascade.ts).
 */
export const CONTENT_ROLES = ['teacher', 'teacher_admin', 'main_admin', 'manager'] as const;

/**
 * True for everyone except a plain teacher — they pick the owning teacher, and may
 * reassign an existing item, rather than owning it themselves.
 */
export const assignsTeacher = (role: string) => role !== 'teacher';

/**
 * Content created by someone who can approve is approved on creation; making them
 * approve their own submission would be busywork. Only a plain teacher's content
 * enters the review queue.
 */
export const autoApproved = (role: string) => role !== 'teacher';
