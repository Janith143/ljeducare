import 'server-only';

import type { Category, Course, HomepageSettings, LiveClass, Quiz, StaffMember } from '@ljeducare/shared';
import { COLLECTIONS, SETTINGS_DOCS } from '@ljeducare/shared';
import { adminDb } from '@/lib/firebase/admin';
import { listPublishedClasses, listPublishedCourses, listPublishedQuizzes, listPublishedTeachers } from './catalog';

export const CATEGORY_TAG = 'categories';

// Categories + homepage settings are tiny and admin-managed — read them FRESH
// (no unstable_cache) so edits show up immediately across all instances.
export async function listCategories(): Promise<Category[]> {
    const snap = await adminDb().collection(COLLECTIONS.CATEGORIES).get();
    return snap.docs
        .map((d) => ({ ...(d.data() as Category), id: d.id }))
        .filter((c) => c.enabled !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

export async function getCategory(slug: string): Promise<Category | null> {
    const all = await listCategories();
    return all.find((c) => c.slug === slug) ?? null;
}

export async function getHomepageSettings(): Promise<HomepageSettings> {
    const doc = await adminDb().collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOCS.HOMEPAGE).get();
    return (doc.data() as HomepageSettings) ?? {};
}

/** A content item matches a category by its stored slug (preferred) or legacy name. */
export function itemInCategory(item: { categorySlug?: string; category?: string }, cat: Category): boolean {
    if (item.categorySlug) return item.categorySlug === cat.slug;
    if (item.category) return item.category === cat.name || item.category === cat.slug;
    return false;
}
const matches = itemInCategory;

/** Distinct published teachers who have content in this category — pinned ones first. */
export async function teachersForCategory(cat: Category): Promise<StaffMember[]> {
    const [classes, courses, quizzes, teachers] = await Promise.all([
        listPublishedClasses(),
        listPublishedCourses(),
        listPublishedQuizzes(),
        listPublishedTeachers(),
    ]);
    const ids = new Set<string>();
    for (const item of [...classes, ...courses, ...quizzes]) {
        if (matches(item, cat) && item.teacherId) ids.add(item.teacherId);
    }
    const pinned = new Set((cat.pinnedTeacherIds ?? []).map(String));
    return teachers
        .filter((t) => ids.has(t.id) || pinned.has(t.id))
        .sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)) || a.name.localeCompare(b.name));
}

/** All published content in a category, grouped by type (for /categories/[slug]). */
export async function contentForCategory(
    cat: Category,
): Promise<{ classes: LiveClass[]; courses: Course[]; quizzes: Quiz[] }> {
    const [classes, courses, quizzes] = await Promise.all([
        listPublishedClasses(),
        listPublishedCourses(),
        listPublishedQuizzes(),
    ]);
    return {
        classes: classes.filter((c) => matches(c, cat)),
        courses: courses.filter((c) => matches(c, cat)),
        quizzes: quizzes.filter((q) => matches(q, cat)),
    };
}
