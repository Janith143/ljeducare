import type { Category, HomepageSettings, StaffMember } from '@ljeducare/shared';
import { COLLECTIONS, SETTINGS_DOCS } from '@ljeducare/shared';
import CategoriesManager from '@/components/admin/categories/CategoriesManager';
import HomepageSettingsForm from '@/components/admin/categories/HomepageSettingsForm';
import { requirePermission } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
    await requirePermission('content');
    const db = adminDb();
    const [catSnap, staffSnap, hpDoc] = await Promise.all([
        db.collection(COLLECTIONS.CATEGORIES).get(),
        db.collection(COLLECTIONS.STAFF).get(),
        db.collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOCS.HOMEPAGE).get(),
    ]);

    const categories = catSnap.docs
        .map((d) => ({ ...(d.data() as Category), id: d.id }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    const teachers = staffSnap.docs
        .map((d) => ({ ...(d.data() as StaffMember), id: d.id }))
        .filter((s) => !s.isDeleted)
        .map((s) => ({ id: s.id, name: s.name }));
    const homepage = (hpDoc.data() as HomepageSettings) ?? {};

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Categories &amp; Homepage</h1>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Organise your storefront: browse categories with images, and what the homepage highlights.
                </p>
            </div>
            <CategoriesManager categories={categories} teachers={teachers} />
            <HomepageSettingsForm settings={homepage} categories={categories} teachers={teachers} />
        </div>
    );
}
