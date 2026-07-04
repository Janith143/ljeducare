/**
 * categories/{id} — admin-managed subject/browse categories shown on the homepage.
 * Content (classes/courses/quizzes) references a category by `categorySlug`; teachers
 * shown under a category are derived from their published content's categorySlug,
 * with `pinnedTeacherIds` surfaced first.
 */
export interface Category {
    id: string;
    name: string;
    slug: string;
    image: string;                 // Storage download URL (category-images/…)
    description?: string;
    order: number;                 // ascending sort (lower shows first)
    featured?: boolean;            // highlighted on the homepage
    enabled?: boolean;             // publicly visible
    pinnedTeacherIds?: string[];   // staff ids to surface first under this category
    createdAt?: string;
}

/**
 * settings/homepage — the storefront homepage config the admin can edit.
 */
export interface HomepageSettings {
    heroTitle?: string;
    heroSubtitle?: string;
    featuredCategorySlugs?: string[];   // order/subset of categories to feature (empty = all featured)
    featuredTeacherIds?: string[];      // "Popular teachers" rail
    updatedAt?: string;
}
