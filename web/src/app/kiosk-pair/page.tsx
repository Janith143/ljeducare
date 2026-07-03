import type { Metadata } from 'next';
import KioskPairClient from '@/components/kiosk/KioskPairClient';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Pair Kiosk Device' };

/** Public device-pairing page — an admin generates the code in Settings. */
export default function KioskPairPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-light-background p-6 dark:bg-dark-background">
            <h1 className="text-2xl font-bold text-primary">{SITE.name} — Kiosk Pairing</h1>
            <KioskPairClient />
        </div>
    );
}
