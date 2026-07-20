import Link from 'next/link';
import type { PublicTeacher } from '@/lib/data/catalog';

/**
 * "Taught by …" byline for a class/course detail page. Links to the teacher's public
 * profile only when they've published it (the /teachers/[slug] page 404s otherwise),
 * so an unpublished teacher is still credited by name.
 */
export default function TeacherByline({ teacher }: { teacher: PublicTeacher }) {
    const img = teacher.profileImage || teacher.avatar || '';

    const inner = (
        <>
            <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-primary/10 ring-2 ring-primary/20">
                {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={teacher.name} className="h-full w-full object-cover" />
                ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-bold text-primary">
                        {teacher.name.slice(0, 1).toUpperCase()}
                    </span>
                )}
            </span>
            <span className="min-w-0">
                <span className="block text-xs text-light-subtle dark:text-dark-subtle">Taught by</span>
                <span className="block truncate font-semibold">{teacher.name}</span>
                {teacher.tagline && (
                    <span className="block truncate text-xs text-light-subtle dark:text-dark-subtle">
                        {teacher.tagline}
                    </span>
                )}
            </span>
        </>
    );

    if (teacher.isPublished) {
        return (
            <Link
                href={`/teachers/${teacher.slug}`}
                className="flex items-center gap-3 rounded-lg transition-colors hover:text-primary"
            >
                {inner}
            </Link>
        );
    }
    return <div className="flex items-center gap-3">{inner}</div>;
}
