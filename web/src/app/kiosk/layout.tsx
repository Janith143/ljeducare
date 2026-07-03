import { requireRole } from '@/lib/auth/session';
import { AuthProvider } from '@/providers/AuthProvider';

/** Kiosk pages are full-screen (no sidebar chrome) — built for a front-desk tablet. */
export default async function KioskLayout({ children }: { children: React.ReactNode }) {
    const user = await requireRole('kiosk', 'main_admin');
    return (
        <AuthProvider user={user}>
            <div className="min-h-screen bg-light-background dark:bg-dark-background">{children}</div>
        </AuthProvider>
    );
}
