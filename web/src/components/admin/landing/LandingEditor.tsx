'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LandingSectionKey, LandingSettings } from '@ljeducare/shared';
import { saveLandingSectionAction } from '@/app/admin/landing-page/actions';
import { FieldGrid } from './Fields';
import { LANDING_SCHEMA, type SectionSchema } from './schema';

type Obj = Record<string, unknown>;

/** One tab: the section's own draft state, saved independently of the others. */
function SectionForm({ schema, initial }: { schema: SectionSchema; initial: Obj }) {
    const router = useRouter();
    const [draft, setDraft] = useState<Obj>(initial);
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Re-key on tab switch would lose edits, so the parent mounts one form per tab.
    const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

    async function save() {
        setBusy(true);
        setError(null);
        setSaved(false);
        const res = await saveLandingSectionAction(
            schema.key as keyof LandingSettings,
            draft as LandingSettings[keyof LandingSettings],
        );
        setBusy(false);
        if (res.error) {
            setError(res.error);
            return;
        }
        setSaved(true);
        router.refresh();
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{schema.label}</h2>
                    {schema.description && (
                        <p className="mt-0.5 text-sm text-light-subtle dark:text-dark-subtle">{schema.description}</p>
                    )}
                </div>
                {!schema.noToggle && (
                    <label className="flex shrink-0 items-center gap-2 rounded-lg border border-light-border px-3 py-2 text-sm font-medium dark:border-dark-border">
                        <input
                            type="checkbox"
                            checked={draft.enabled !== false}
                            onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
                        />
                        Show this section
                    </label>
                )}
            </div>

            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}
            {saved && !dirty && (
                <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                    Saved — your changes are live on the landing page.
                </p>
            )}

            {!schema.noHeader && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium">Section heading</span>
                        <input
                            className="input"
                            value={typeof draft.title === 'string' ? draft.title : ''}
                            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium">Section sub-heading</span>
                        <input
                            className="input"
                            value={typeof draft.subtitle === 'string' ? draft.subtitle : ''}
                            onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value }))}
                        />
                    </label>
                </div>
            )}

            <FieldGrid fields={schema.fields} value={draft} onChange={setDraft} />

            <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-light-border bg-light-surface/95 px-4 py-3 backdrop-blur dark:border-dark-border dark:bg-dark-surface/95">
                <button type="button" onClick={save} disabled={busy || !dirty} className="btn-primary">
                    {busy ? 'Saving…' : `Save ${schema.label}`}
                </button>
                {dirty && !busy && (
                    <>
                        <span className="text-xs text-light-subtle dark:text-dark-subtle">Unsaved changes</span>
                        <button
                            type="button"
                            onClick={() => {
                                setDraft(initial);
                                setError(null);
                            }}
                            className="text-xs font-medium text-light-subtle hover:text-primary dark:text-dark-subtle"
                        >
                            Discard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

/** Tabbed CMS for the whole landing page. */
export default function LandingEditor({ settings }: { settings: LandingSettings }) {
    const [active, setActive] = useState<LandingSectionKey>('brand');
    const schema = LANDING_SCHEMA.find((s) => s.key === active) ?? LANDING_SCHEMA[0];
    const initial = (settings[active] ?? {}) as Obj;

    return (
        <div className="space-y-4">
            <nav className="flex flex-wrap gap-2" aria-label="Landing page sections">
                {LANDING_SCHEMA.map((s) => (
                    <button
                        key={s.key}
                        type="button"
                        onClick={() => setActive(s.key)}
                        aria-current={s.key === active}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            s.key === active
                                ? 'border-primary bg-primary text-white'
                                : 'border-light-border hover:border-primary dark:border-dark-border'
                        }`}
                    >
                        {s.label}
                        {settings[s.key] &&
                            typeof settings[s.key] === 'object' &&
                            (settings[s.key] as { enabled?: boolean }).enabled === false && (
                                <span className="ml-1 opacity-70">(hidden)</span>
                            )}
                    </button>
                ))}
            </nav>

            <section className="card">
                {/* Keyed so switching tabs mounts a fresh draft from the saved data. */}
                <SectionForm key={schema.key} schema={schema} initial={initial} />
            </section>
        </div>
    );
}
