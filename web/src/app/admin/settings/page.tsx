import type { NotificationSettings } from '@ljeducare/shared';
import { COLLECTIONS, SETTINGS_DOCS } from '@ljeducare/shared';
import BankDetailsForm from '@/components/admin/settings/BankDetailsForm';
import CurrencySettingsForm from '@/components/admin/settings/CurrencySettingsForm';
import KioskDevicesCard from '@/components/admin/settings/KioskDevicesCard';
import MarketplaceConnectionForm from '@/components/admin/settings/MarketplaceConnectionForm';
import NotificationSettingsForm from '@/components/admin/settings/NotificationSettingsForm';
import { requirePermission } from '@/lib/auth/session';
import { getCurrencySettings } from '@/lib/data/currencies';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
    await requirePermission('settings'); // main_admin only (MAIN_ADMIN_ONLY)

    const [currencies, gatewaysDoc, notifDoc, connectorDoc] = await Promise.all([
        getCurrencySettings(),
        adminDb().doc(`${COLLECTIONS.SETTINGS}/${SETTINGS_DOCS.GATEWAYS}`).get(),
        adminDb().doc(`${COLLECTIONS.SETTINGS}/${SETTINGS_DOCS.NOTIFICATIONS}`).get(),
        adminDb().doc(`${COLLECTIONS.SETTINGS}/connector`).get(),
    ]);
    const bank = gatewaysDoc.data()?.bankDetails ?? {};
    const notifications = (notifDoc.data() as NotificationSettings) ?? {};
    // Only whether a key exists ever reaches the client — never the key itself.
    const connector = connectorDoc.data() ?? {};
    const marketplace = {
        configured: typeof connector.hubKey === 'string' && connector.hubKey.length > 0,
        enabled: connector.enabled !== false,
        updatedAt: (connector.updatedAt as string) ?? null,
        providerId: (connector.providerId as string) ?? '',
        hubUrl: (connector.hubUrl as string) ?? '',
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <div className="grid gap-6 lg:grid-cols-2">
                <CurrencySettingsForm settings={currencies} />
                <BankDetailsForm initial={bank} />
                <NotificationSettingsForm settings={notifications} />
                <KioskDevicesCard />
                <MarketplaceConnectionForm initial={marketplace} />
                <section className="card space-y-1 text-sm">
                    <h2 className="font-semibold">Payment gateways</h2>
                    <p className="text-light-subtle dark:text-dark-subtle">
                        PayPal credentials are configured as Cloud Function secrets (see SETUP.md §5) —
                        they are never stored in the database.
                    </p>
                </section>
                <section className="card space-y-1 text-sm">
                    <h2 className="font-semibold">SMS gateway</h2>
                    <p className="text-light-subtle dark:text-dark-subtle">
                        SMS is sent via Notify.lk. Credentials are Cloud Function secrets, not database values
                        (see SETUP.md §9). Run <code>node scripts/check-sms.mjs --account</code> to verify them
                        and read your balance without sending anything.
                    </p>
                </section>
            </div>
        </div>
    );
}
