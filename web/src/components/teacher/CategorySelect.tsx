'use client';

export interface CategoryOpt {
    slug: string;
    name: string;
}

/**
 * Category picker for content forms. Submits the category SLUG (name="categorySlug").
 * Falls back to matching a legacy free-text `category` name when editing older content.
 */
export default function CategorySelect({
    categories,
    defaultSlug,
    defaultName,
}: {
    categories: CategoryOpt[];
    defaultSlug?: string;
    defaultName?: string;
}) {
    const initial = defaultSlug || categories.find((c) => c.name === defaultName)?.slug || '';
    return (
        <label className="block text-sm">
            <span className="mb-1 block font-medium">Category</span>
            <select name="categorySlug" defaultValue={initial} className="input">
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
            </select>
            {categories.length === 0 && (
                <span className="mt-1 block text-xs text-light-subtle dark:text-dark-subtle">
                    No categories yet — an admin can add them under Categories &amp; Homepage.
                </span>
            )}
        </label>
    );
}
