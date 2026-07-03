interface Submission {
    studentId: string;
    link: string;
    submittedAt: string;
}

/** Read-only list of student homework submissions for a class, newest date first. */
export default function HomeworkSubmissions({
    submissions,
    studentNames,
}: {
    submissions: Record<string, Submission[]>;
    studentNames: Record<string, string>;
}) {
    const dates = Object.keys(submissions).sort((a, b) => b.localeCompare(a));
    const total = dates.reduce((n, d) => n + submissions[d].length, 0);

    return (
        <section className="card space-y-3">
            <h2 className="font-semibold">Homework submissions ({total})</h2>
            {total === 0 ? (
                <p className="text-sm text-light-subtle dark:text-dark-subtle">No homework submitted yet.</p>
            ) : (
                dates.map((date) => (
                    <div key={date} className="space-y-1">
                        <p className="text-xs font-semibold text-light-subtle dark:text-dark-subtle">{date}</p>
                        <ul className="divide-y divide-light-border text-sm dark:divide-dark-border">
                            {submissions[date].map((s) => (
                                <li key={s.studentId} className="flex items-center justify-between gap-3 py-1.5">
                                    <span>{studentNames[s.studentId] ?? s.studentId}</span>
                                    <a href={s.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                        Open submission ↗
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            )}
        </section>
    );
}
