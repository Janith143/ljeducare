'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, HomepageSettings } from '@ljeducare/shared';
import { saveHomepageAction } from '@/app/admin/categories/actions';

interface TeacherOpt { id: string; name: string }

/** Admin editor for the storefront homepage: hero copy + "popular teachers" rail. */
export default function HomepageSettingsForm({
    settings,
    categories,
    teachers,
}: {
    settings: HomepageSettings;
    categories: Category[];
    teachers: TeacherOpt[];
}) {
    const router = useRouter();
    const [heroTitle, setHeroTitle] = useState(settings.heroTitle ?? '');
    const [heroSubtitle, setHeroSubtitle] = useState(settings.heroSubtitle ?? '');
    const [featuredTeacherIds, setFeaturedTeacherIds] = useState<string[]>(settings.featuredTeacherIds ?? []);
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    void categories; // reserved for future featured-category ordering

    function toggleTeacher(id: string) {
        setFeaturedTeacherIds((cur) => (cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id]));
    }

    async function save() {
        setBusy(true); setError(null); setSaved(false);
        const res = await saveHomepageAction({ heroTitle, heroSubtitle, featuredTeacherIds });
        setBusy(false);
        if (res.error) { setError(res.error); return; }
        setSaved(true);
        router.refresh();
    }

    return (
        <section className="card space-y-4">
            <h2 className="text-lg font-semibold">Homepage</h2>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
            {saved && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">Saved.</p>}

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">Hero title</span>
                    <input className="input" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="Learn with the best teachers" />
                </label>
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">Hero subtitle</span>
                    <input className="input" value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} placeholder="Courses, classes & quizzes across every subject" />
                </label>
            </div>

            {teachers.length > 0 && (
                <div>
                    <span className="mb-2 block text-sm font-medium">Popular teachers rail</span>
                    <div className="flex flex-wrap gap-2">
                        {teachers.map((t) => {
                            const on = featuredTeacherIds.includes(t.id);
                            return (
                                <button key={t.id} type="button" onClick={() => toggleTeacher(t.id)}
                                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? 'border-primary bg-primary text-white' : 'border-light-border hover:border-primary dark:border-dark-border'}`}>
                                    {t.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <button type="button" onClick={save} disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save homepage'}</button>
        </section>
    );
}
