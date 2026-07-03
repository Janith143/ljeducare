import type { MetadataRoute } from 'next';
import {
    listPublishedClasses,
    listPublishedCourses,
    listPublishedQuizzes,
    listPublishedTeachers,
} from '@/lib/data/catalog';
import { SITE } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [classes, courses, quizzes, teachers] = await Promise.all([
        listPublishedClasses(),
        listPublishedCourses(),
        listPublishedQuizzes(),
        listPublishedTeachers(),
    ]);

    const staticPages = ['', '/classes', '/courses', '/quizzes', '/exams', '/teachers', '/privacy', '/terms', '/refund-policy'].map(
        (path) => ({
            url: `${SITE.url}${path}`,
            changeFrequency: 'daily' as const,
            priority: path === '' ? 1 : 0.7,
        }),
    );

    return [
        ...staticPages,
        ...classes.map((c) => ({ url: `${SITE.url}/classes/${c.slug}`, changeFrequency: 'daily' as const, priority: 0.8 })),
        ...courses.map((c) => ({ url: `${SITE.url}/courses/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
        ...quizzes.map((q) => ({ url: `${SITE.url}/quizzes/${q.slug}`, changeFrequency: 'daily' as const, priority: 0.6 })),
        ...teachers.map((t) => ({ url: `${SITE.url}/teachers/${t.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ];
}
