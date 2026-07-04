import type { Category } from '@ljeducare/shared';
import CategoryCard from '@/components/catalog/CategoryCard';
import { listCategories } from '@/lib/data/categories';
import { listPublishedClasses, listPublishedCourses, listPublishedQuizzes } from '@/lib/data/catalog';

export const revalidate = 300;

export const metadata = { title: 'Browse categories' };

const inCategory = (item: { categorySlug?: string; category?: string }, cat: Category) =>
    item.categorySlug ? item.categorySlug === cat.slug : item.category === cat.name || item.category === cat.slug;

export default async function CategoriesPage() {
    const [categories, courses, quizzes, classes] = await Promise.all([
        listCategories(),
        listPublishedCourses(),
        listPublishedQuizzes(),
        listPublishedClasses(),
    ]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-10">
            <h1 className="text-3xl font-bold">Browse by category</h1>
            <p className="mt-1 text-light-subtle dark:text-dark-subtle">Find teachers and content across every subject.</p>

            {categories.length === 0 ? (
                <p className="card mt-8 text-sm text-light-subtle dark:text-dark-subtle">No categories yet.</p>
            ) : (
                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {categories.map((cat) => (
                        <CategoryCard
                            key={cat.id}
                            category={cat}
                            count={
                                courses.filter((c) => inCategory(c, cat)).length +
                                quizzes.filter((q) => inCategory(q, cat)).length +
                                classes.filter((c) => inCategory(c, cat)).length
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
