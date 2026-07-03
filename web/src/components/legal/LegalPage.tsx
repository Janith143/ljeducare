import { SITE } from '@/lib/site';

/**
 * Shared legal-page shell. Content here is a starter template — the institute
 * should review and replace with their own policies before launch.
 */
export default function LegalPage({
    title,
    sections,
}: {
    title: string;
    sections: { heading: string; body: string }[];
}) {
    return (
        <article className="mx-auto max-w-3xl space-y-6 px-4 py-10">
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                {SITE.name} — last updated {new Date().toISOString().slice(0, 10)}
            </p>
            {sections.map((s) => (
                <section key={s.heading} className="space-y-2">
                    <h2 className="text-xl font-semibold">{s.heading}</h2>
                    <p className="whitespace-pre-line text-light-subtle dark:text-dark-subtle">{s.body}</p>
                </section>
            ))}
        </article>
    );
}
