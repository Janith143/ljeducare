import { approvalOf } from '@ljeducare/shared';
import ContentTable, { toRows } from '@/components/admin/content/ContentTable';
import { requirePermission } from '@/lib/auth/session';
import { loadAllContent } from '@/lib/data/adminContent';

export const dynamic = 'force-dynamic';

/** Approval queue: what teachers have submitted, plus everything still unpublished. */
export default async function AdminContentPage() {
    await requirePermission('content');
    const { classes, courses, teacherNames } = await loadAllContent();

    const pending = toRows(
        classes.filter((c) => approvalOf(c.adminApproval) === 'pending'),
        courses.filter((c) => approvalOf(c.adminApproval) === 'pending'),
        teacherNames,
    );
    // Everything else not yet live — drafts a teacher hasn't submitted, and anything
    // sent back for changes.
    const other = toRows(
        classes.filter((c) => !c.isPublished && approvalOf(c.adminApproval) !== 'pending'),
        courses.filter((c) => !c.isPublished && approvalOf(c.adminApproval) !== 'pending'),
        teacherNames,
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Content Review</h1>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Teachers submit classes and courses here for approval. Approving one publishes it to the
                    public site; requesting changes sends it back with a note.
                </p>
            </div>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">
                    Waiting for approval{pending.length ? ` (${pending.length})` : ''}
                </h2>
                {pending.length ? (
                    <ContentTable rows={pending} />
                ) : (
                    <p className="card text-sm text-light-subtle dark:text-dark-subtle">
                        Nothing waiting — you&apos;re all caught up.
                    </p>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Not published yet</h2>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Drafts teachers haven&apos;t submitted, and items sent back for changes.
                </p>
                <ContentTable rows={other} />
            </section>
        </div>
    );
}
