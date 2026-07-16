import Link from 'next/link';
import LandingEditor from '@/components/admin/landing/LandingEditor';
import { requirePermission } from '@/lib/auth/session';
import { getLandingSettings } from '@/lib/data/landing';
import { LANDING_PATH } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Landing page' };

/** CMS for the public marketing landing page at `/`. */
export default async function AdminLandingPage() {
    await requirePermission('landing_page');
    const settings = await getLandingSettings();

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Landing Page</h1>
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">
                        Everything on the marketing page at{' '}
                        <code className="rounded bg-light-background px-1 dark:bg-dark-background">{LANDING_PATH}</code>.
                        Pick a section, edit it, and save — changes go live immediately.
                    </p>
                </div>
                <div className="flex shrink-0 gap-2">
                    <Link href="/admin/inquiries" className="btn-secondary text-sm">
                        Inquiries
                    </Link>
                    <Link href={LANDING_PATH} target="_blank" rel="noreferrer" className="btn-secondary text-sm">
                        View page ↗
                    </Link>
                </div>
            </div>

            {settings.updatedAt && (
                <p className="text-xs text-light-subtle dark:text-dark-subtle">
                    Last edited {new Date(settings.updatedAt).toLocaleString()}
                    {settings.updatedBy ? ` by ${settings.updatedBy}` : ''}.
                </p>
            )}

            <LandingEditor settings={settings} />
        </div>
    );
}
