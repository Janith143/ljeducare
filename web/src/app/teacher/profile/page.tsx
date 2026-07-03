import { Suspense } from 'react';
import type { StaffMember } from '@ljeducare/shared';
import ZoomConnectionCard, { type ZoomState } from '@/components/teacher/ZoomConnectionCard';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile } from '@/lib/data/teacher';

export const dynamic = 'force-dynamic';

type ZoomFields = StaffMember & {
    useCustomZoomApp?: boolean;
    customZoomClientId?: string;
    zoomAutoRecordEnabled?: boolean;
};

export default async function TeacherProfilePage() {
    const user = await requireRole('teacher', 'teacher_admin');
    const staff = (await getOwnStaffProfile(user)) as ZoomFields | null;

    return (
        <div className="max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">My Profile</h1>

            {staff ? (
                <>
                    <section className="card space-y-1">
                        <h2 className="font-semibold">{staff.name}</h2>
                        <p className="text-sm text-light-subtle dark:text-dark-subtle">
                            {staff.subjects?.join(', ')} · Commission {staff.commissionRate}%
                        </p>
                        <p className="text-sm text-light-subtle dark:text-dark-subtle">{staff.email}</p>
                    </section>

                    <Suspense>
                        <ZoomConnectionCard
                            zoom={{
                                staffId: staff.id,
                                connected: !!staff.zoomAccountConnected,
                                email: staff.zoomEmail,
                                useCustomApp: !!staff.useCustomZoomApp,
                                customClientId: staff.customZoomClientId,
                                autoRecord: staff.zoomAutoRecordEnabled !== false,
                            } satisfies ZoomState}
                        />
                    </Suspense>
                </>
            ) : (
                <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                    No teaching profile is linked to your account yet — ask an admin to set one up.
                </p>
            )}
        </div>
    );
}
