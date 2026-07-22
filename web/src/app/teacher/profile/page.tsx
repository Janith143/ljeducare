import { Suspense } from 'react';
import type { StaffMember } from '@ljeducare/shared';
import TeacherProfileEditor from '@/components/teacher/TeacherProfileEditor';
import ZoomConnectionCard, { type ZoomState } from '@/components/teacher/ZoomConnectionCard';
import { requireRole } from '@/lib/auth/session';
import { getOwnStaffProfile } from '@/lib/data/teacher';
import { TEACHING_ROLES } from '@ljeducare/shared';

export const dynamic = 'force-dynamic';

type ZoomFields = StaffMember & {
    useCustomZoomApp?: boolean;
    customZoomClientId?: string;
    zoomAutoRecordEnabled?: boolean;
};

export default async function TeacherProfilePage() {
    const user = await requireRole(...TEACHING_ROLES);
    const staff = (await getOwnStaffProfile(user)) as ZoomFields | null;

    return (
        <div className="max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">My Profile</h1>

            {/* Self-service editor. Renders even with no linked staff doc — the save
                action creates one on first save (ensureStaffProfile). */}
            <TeacherProfileEditor
                staff={staff ? { ...staff } : { name: user.name ?? '', email: user.email ?? undefined }}
            />

            {/* Zoom connection needs an existing staff profile. */}
            {staff && (
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
            )}
        </div>
    );
}
