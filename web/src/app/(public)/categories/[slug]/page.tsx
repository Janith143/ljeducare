import { notFound } from 'next/navigation';
import TeacherCard from '@/components/catalog/TeacherCard';
import ProductCard from '@/components/catalog/ProductCard';
import { contentForCategory, getCategory, teachersForCategory } from '@/lib/data/categories';
import { getCurrencySettings } from '@/lib/data/currencies';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const cat = await getCategory(slug);
    return { title: cat ? cat.name : 'Category' };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const cat = await getCategory(slug);
    if (!cat) notFound();

    const [teachers, content, settings] = await Promise.all([
        teachersForCategory(cat),
        contentForCategory(cat),
        getCurrencySettings(),
    ]);
    const { classes, courses, quizzes } = content;
    const empty = !teachers.length && !classes.length && !courses.length && !quizzes.length;

    return (
        <div>
            {/* Banner */}
            <section className="relative overflow-hidden border-b border-light-border dark:border-dark-border">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/25 to-primary/5" />
                {cat.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cat.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
                )}
                <div className="relative mx-auto max-w-7xl px-4 py-14">
                    <h1 className="text-4xl font-extrabold tracking-tight">{cat.name}</h1>
                    {cat.description && <p className="mt-2 max-w-2xl text-light-subtle dark:text-dark-subtle">{cat.description}</p>}
                </div>
            </section>

            <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
                {empty && (
                    <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                        Nothing here yet — check back soon.
                    </p>
                )}

                {teachers.length > 0 && (
                    <section>
                        <h2 className="mb-4 text-xl font-bold">Teachers</h2>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                            {teachers.map((t) => <TeacherCard key={t.id} teacher={t} />)}
                        </div>
                    </section>
                )}

                {courses.length > 0 && (
                    <section>
                        <h2 className="mb-4 text-xl font-bold">Courses</h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {courses.map((c) => (
                                <ProductCard key={c.id} href={`/courses/${c.slug}`} title={c.title} subtitle={c.subject} image={c.coverImage} typeLabel="Course" pricing={c.pricing} settings={settings} cartItem={{ itemType: 'course', itemId: c.id, title: c.title, image: c.coverImage, pricing: c.pricing }} />
                            ))}
                        </div>
                    </section>
                )}

                {classes.length > 0 && (
                    <section>
                        <h2 className="mb-4 text-xl font-bold">Classes</h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {classes.map((c) => (
                                <ProductCard key={c.id} href={`/classes/${c.slug}`} title={c.title} subtitle={`${c.subject} · ${c.targetAudience}`} typeLabel="Class" pricing={c.pricing} settings={settings} />
                            ))}
                        </div>
                    </section>
                )}

                {quizzes.length > 0 && (
                    <section>
                        <h2 className="mb-4 text-xl font-bold">Quizzes</h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {quizzes.map((c) => (
                                <ProductCard key={c.id} href={`/quizzes/${c.slug}`} title={c.title} subtitle={c.subject} typeLabel="Quiz" pricing={c.pricing} settings={settings} cartItem={{ itemType: 'quiz', itemId: c.id, title: c.title, pricing: c.pricing }} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
