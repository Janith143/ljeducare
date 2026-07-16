import Link from 'next/link';
import SignOutButton from '@/components/layout/SignOutButton';
import { requireRole } from '@/lib/auth/session';
import { SITE } from '@/lib/site';

export default async function KioskHomePage() {
    await requireRole('kiosk', 'main_admin');
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
            <h1 className="text-3xl font-bold text-primary">{SITE.name} — Attendance Kiosk</h1>
            <p className="max-w-md text-light-subtle dark:text-dark-subtle">
                This device is paired. Start scanning student QR codes for a class session.
            </p>
            <Link href="/kiosk/scan" className="btn-primary px-8 py-4 text-lg">
                Start Scanning
            </Link>

            {/* Escape hatch. Without it this browser is stranded as the kiosk account:
                every other area redirects back here, and the only way out is knowing
                the /api/logout URL. */}
            <div className="mt-4 flex items-center gap-3 text-xs text-light-subtle dark:text-dark-subtle">
                <span>Not a kiosk device?</span>
                <SignOutButton />
            </div>
        </div>
    );
}
