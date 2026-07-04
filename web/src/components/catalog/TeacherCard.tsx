import Link from 'next/link';
import type { StaffMember } from '@ljeducare/shared';

/** Teacher avatar card → /teachers/[slug]. */
export default function TeacherCard({ teacher }: { teacher: StaffMember }) {
    const img = teacher.profileImage || teacher.avatar || '';
    const subjects = teacher.subjects ?? [];
    return (
        <Link
            href={`/teachers/${teacher.slug}`}
            className="card group flex flex-col items-center gap-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
            <div className="h-20 w-20 overflow-hidden rounded-full bg-primary/10 ring-2 ring-primary/20">
                {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={teacher.name} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                        {teacher.name.slice(0, 1).toUpperCase()}
                    </div>
                )}
            </div>
            <div>
                <h3 className="font-semibold group-hover:text-primary">{teacher.name}</h3>
                {teacher.tagline && (
                    <p className="line-clamp-1 text-xs text-light-subtle dark:text-dark-subtle">{teacher.tagline}</p>
                )}
            </div>
            {subjects.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1">
                    {subjects.slice(0, 3).map((s) => (
                        <span
                            key={s}
                            className="rounded-full bg-light-bg px-2 py-0.5 text-[11px] text-light-subtle dark:bg-dark-bg dark:text-dark-subtle"
                        >
                            {s}
                        </span>
                    ))}
                </div>
            )}
        </Link>
    );
}
