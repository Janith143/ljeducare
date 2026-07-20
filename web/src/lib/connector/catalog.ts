import 'server-only';
import { COLLECTIONS } from '@ljeducare/shared';
import type { Course, LiveClass, StaffMember } from '@ljeducare/shared';
import { adminDb } from '@/lib/firebase/admin';
import { listPublishedClasses, listPublishedCourses } from '@/lib/data/catalog';
import { SITE } from '@/lib/site';

/**
 * Connector /catalog — the provider-agnostic PUBLIC catalog returned to the clazz.lk
 * marketplace hub. Everything here is display/marketing data for rendering cards + detail
 * pages on the hub's OWN domain (white-label). Two rules:
 *   1. WHITELIST fields (never spread a doc) — so paid/delivery data (lecture videoUrl,
 *      join links, recordings) and PII (teacher email/contact, money) can never leak. The
 *      actual paid content is fetched later, per-purchase, via /content (Phase 3).
 *   2. NO provider deep-links — the hub builds its own URLs from id/slug; a link back to
 *      ljeducare.com would defeat white-label.
 * This is contract v1: any "similar platform" implements the same shape.
 */
export const CATALOG_CONTRACT_VERSION = 1;

export interface CatalogPricing {
    basePrice: number;
    currency: string;
    isFree: boolean;
    hidePrice?: boolean;
    freeUntil?: string;
    weeklyPaymentOption?: string;
    paymentPlans?: string[];
}
export interface CatalogClass {
    id: string; slug: string; title: string; subject: string; description: string;
    medium?: string; grade?: string; targetAudience?: string; teacherId: string;
    pricing: CatalogPricing;
    schedule: { date: string; startTime: string; endTime: string; recurrence: string; flexibleDates?: unknown[]; endDate?: string };
    mode: string; categorySlug?: string; category?: string; status: string;
}
export interface CatalogCourse {
    id: string; slug: string; title: string; subject: string; description: string;
    coverImage: string; medium?: string; grade?: string; teacherId: string;
    pricing: CatalogPricing; type: string;
    curriculum: Array<{ id: string; title: string; description: string; durationMinutes: number; isFreePreview: boolean }>;
    liveOutline: Array<{ id: string; title: string; description?: string; date: string; startTime: string; endTime: string }>;
    categorySlug?: string; category?: string; ratingCount: number; ratingAvg: number; createdAt?: string;
}
export interface CatalogTeacher {
    id: string; slug: string; name: string; avatar: string; tagline?: string; bio?: string; subjects: string[];
}
export interface CatalogCategory { id: string; name: string; slug: string }
export interface PublicCatalog {
    contractVersion: number;
    provider: { name: string };
    classes: CatalogClass[];
    courses: CatalogCourse[];
    teachers: CatalogTeacher[];
    categories: CatalogCategory[];
}

function mapClass(c: LiveClass): CatalogClass {
    return {
        id: c.id, slug: c.slug, title: c.title, subject: c.subject, description: c.description,
        medium: c.medium, grade: c.grade, targetAudience: c.targetAudience, teacherId: c.teacherId,
        pricing: {
            basePrice: c.pricing?.basePrice ?? 0, currency: SITE.defaultCurrency, isFree: !!c.pricing?.isFree,
            hidePrice: !!c.hidePrice, freeUntil: c.freeUntil, weeklyPaymentOption: c.weeklyPaymentOption,
        },
        schedule: {
            date: c.date, startTime: c.startTime, endTime: c.endTime, recurrence: c.recurrence,
            flexibleDates: c.flexibleDates, endDate: c.endDate,
        },
        mode: c.mode, categorySlug: c.categorySlug, category: c.category, status: c.status,
    };
}

function mapCourse(c: Course): CatalogCourse {
    const ratings = c.ratings ?? [];
    const avg = ratings.length ? ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length : 0;
    return {
        id: c.id, slug: c.slug, title: c.title, subject: c.subject, description: c.description,
        coverImage: c.coverImage, medium: c.medium, grade: c.grade, teacherId: c.teacherId,
        pricing: {
            basePrice: c.pricing?.basePrice ?? 0, currency: SITE.defaultCurrency, isFree: !!c.pricing?.isFree,
            paymentPlans: c.paymentPlans,
        },
        type: c.type,
        // Curriculum OUTLINE only — videoUrl/resourcesUrl deliberately stripped.
        curriculum: (c.lectures ?? []).map((l) => ({
            id: l.id, title: l.title, description: l.description, durationMinutes: l.durationMinutes, isFreePreview: l.isFreePreview,
        })),
        // Live session OUTLINE only — joinLink/recordingLink deliberately stripped.
        liveOutline: (c.liveSessions ?? []).map((s) => ({
            id: s.id, title: s.title, description: s.description, date: s.date, startTime: s.startTime, endTime: s.endTime,
        })),
        categorySlug: c.categorySlug, category: c.category,
        ratingCount: ratings.length, ratingAvg: Math.round(avg * 10) / 10, createdAt: c.createdAt,
    };
}

function mapTeacher(t: StaffMember): CatalogTeacher {
    // Name + photo + tagline/bio/subjects only — email, contact, money stripped.
    return {
        id: t.id, slug: t.slug, name: t.name, avatar: t.avatar || t.profileImage || '',
        tagline: t.tagline, bio: t.bio, subjects: t.subjects ?? [],
    };
}

/**
 * Teachers referenced by the published content, resolved BY ID (via getAll) — not by
 * `staff.isPublished`. A class/course can be published while its teacher's public profile
 * isn't, so filtering on the profile flag would leave cards with no teacher to label. We
 * only expose name/photo/tagline for labeling, so profile-published status is irrelevant.
 */
async function fetchTeachersByIds(ids: string[]): Promise<CatalogTeacher[]> {
    if (!ids.length) return [];
    const db = adminDb();
    const snaps = await db.getAll(...ids.map((id) => db.collection(COLLECTIONS.STAFF).doc(id)));
    return snaps
        .filter((s) => s.exists)
        .map((s) => mapTeacher({ ...(s.data() as StaffMember), id: s.id }));
}

export async function buildPublicCatalog(): Promise<PublicCatalog> {
    const [rawClasses, rawCourses, catSnap] = await Promise.all([
        listPublishedClasses(),
        listPublishedCourses(),
        adminDb().collection(COLLECTIONS.CATEGORIES).get(),
    ]);
    const classes = rawClasses.map(mapClass);
    const courses = rawCourses.map(mapCourse);

    const teacherIds = [...new Set([...classes, ...courses].map((i) => i.teacherId).filter(Boolean))];
    const teachers = await fetchTeachersByIds(teacherIds);

    const categories: CatalogCategory[] = catSnap.docs
        .map((d) => ({ id: d.id, name: String(d.data().name ?? ''), slug: String(d.data().slug ?? '') }))
        .filter((c) => c.slug && c.name);

    return {
        contractVersion: CATALOG_CONTRACT_VERSION,
        provider: { name: SITE.name },
        classes,
        courses,
        teachers,
        categories,
    };
}
