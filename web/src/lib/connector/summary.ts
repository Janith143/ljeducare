import 'server-only';
import type { DocumentData, DocumentReference } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@ljeducare/shared';
import { adminDb } from '@/lib/firebase/admin';
import { SITE } from '@/lib/site';

/**
 * Normalized, display-ready view of a student's LJ Educare content, returned to the
 * studentportal hub. Deep-link URLs are absolute (the student opens them and signs in
 * on LJ Educare separately). Shape is provider-agnostic so the hub renders any
 * instance's content uniformly.
 */
export interface ProviderSummary {
    profile: { studentId: string | null; name: string };
    classes: Array<{ id: string; name: string; schedule: string; nextSession: string | null; joinUrl: string }>;
    courses: Array<{ id: string; name: string; url: string }>;
    certificates: Array<{ id: string; title: string; verifyUrl: string }>;
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

async function fetchByIds(
    coll: string,
    ids: string[],
): Promise<Array<{ id: string; data: DocumentData }>> {
    if (!ids.length) return [];
    const db = adminDb();
    const refs: DocumentReference[] = ids.map((id) => db.collection(coll).doc(id));
    const snaps = await db.getAll(...refs);
    return snaps.filter((s) => s.exists).map((s) => ({ id: s.id, data: s.data() ?? {} }));
}

export async function buildStudentSummary(uid: string): Promise<ProviderSummary | null> {
    const db = adminDb();
    const base = SITE.url.replace(/\/$/, '');

    const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    const user = userSnap.data();
    if (!user) return null;

    const classIds: string[] = (user.enrolledClassIds ?? []).map(String);
    const courseIds: string[] = (user.enrolledCourseIds ?? []).map(String);

    const [classDocs, courseDocs, certSnap] = await Promise.all([
        fetchByIds(COLLECTIONS.CLASSES, classIds),
        fetchByIds(COLLECTIONS.COURSES, courseIds),
        db.collection(COLLECTIONS.CERTIFICATES).where('studentId', '==', uid).get(),
    ]);

    const classes = classDocs
        .filter(({ data }) => !data.isDeleted)
        .map(({ id, data }) => {
            const start = str(data.startTime);
            const end = str(data.endTime);
            const weekly = data.recurrence === 'weekly';
            return {
                id,
                name: str(data.title, 'Class'),
                schedule: weekly
                    ? `Weekly · ${start}–${end}`
                    : `${str(data.date)} · ${start}–${end}`.trim(),
                nextSession: weekly ? null : (str(data.date) || null),
                joinUrl: `${base}/student/classes`,
            };
        });

    const courses = courseDocs
        .filter(({ data }) => !data.isDeleted)
        .map(({ id, data }) => ({
            id,
            name: str(data.title) || str(data.name, 'Course'),
            url: `${base}/student/courses`,
        }));

    const certificates = certSnap.docs.map((d) => {
        const c = d.data();
        const vid = str(c.verificationId, d.id);
        return { id: vid, title: str(c.itemTitle, 'Certificate'), verifyUrl: `${base}/verify/${vid}` };
    });

    const name = `${str(user.firstName)} ${str(user.lastName)}`.trim() || str(user.email, 'Student');
    return {
        profile: { studentId: str(user.studentId) || null, name },
        classes,
        courses,
        certificates,
    };
}
