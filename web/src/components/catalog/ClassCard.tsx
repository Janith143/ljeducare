import Link from 'next/link';
import type { CurrencySettings, LiveClass } from '@ljeducare/shared';
import PriceTag from './PriceTag';

const MODE_BADGE: Record<LiveClass['mode'], string> = {
    Online: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    Physical: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    Both: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

/** Public class card — a real link to /classes/[slug]. */
export default function ClassCard({
    cls,
    settings,
}: {
    cls: LiveClass;
    settings: CurrencySettings;
}) {
    return (
        <Link href={`/classes/${cls.slug}`} className="card group flex flex-col gap-2 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold group-hover:text-primary">{cls.title}</h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${MODE_BADGE[cls.mode]}`}>
                    {cls.mode}
                </span>
            </div>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                {cls.subject} · {cls.targetAudience}
                {cls.medium ? ` · ${cls.medium}` : ''}
            </p>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                {cls.recurrence === 'weekly' ? `Weekly · ${cls.startTime}–${cls.endTime}` : `${cls.date} · ${cls.startTime}–${cls.endTime}`}
            </p>
            <div className="mt-auto flex items-center justify-between pt-2">
                {cls.hidePrice ? <span /> : <PriceTag pricing={cls.pricing} settings={settings} />}
                <span className="text-sm font-medium text-primary">View class →</span>
            </div>
        </Link>
    );
}
