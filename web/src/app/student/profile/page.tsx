import type { User } from '@ljeducare/shared';
import { COLLECTIONS } from '@ljeducare/shared';
import StudentProfileForm from '@/components/student/StudentProfileForm';
import SignOutButton from '@/components/layout/SignOutButton';
import { requireRole } from '@/lib/auth/session';
import { getCurrencySettings } from '@/lib/data/currencies';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export default async function StudentProfilePage() {
    const user = await requireRole('student');
    const [userDoc, currencies] = await Promise.all([
        adminDb().collection(COLLECTIONS.USERS).doc(user.uid).get(),
        getCurrencySettings(),
    ]);
    const data = (userDoc.data() as User | undefined) ?? ({} as User);

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">My Profile</h1>
                <SignOutButton />
            </div>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Signed in as {data.email}. Keep your guardian contact up to date for attendance alerts.
            </p>
            <StudentProfileForm
                initial={{
                    firstName: data.firstName ?? '',
                    lastName: data.lastName ?? '',
                    contactNumber: data.contactNumber ?? '',
                    guardianPhone: data.guardianPhone ?? '',
                    guardianEmail: data.guardianEmail ?? '',
                    school: data.schools?.[0] ?? '',
                    preferredCurrency: data.preferredCurrency ?? currencies.base,
                }}
                currencies={currencies.enabled}
            />
        </div>
    );
}
