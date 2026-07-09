'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@ljeducare/shared';
import {
    deleteCategoryAction,
    reorderCategoriesAction,
    saveCategoryAction,
    uploadCategoryImageAction,
    type CategoryFormInput,
} from '@/app/admin/categories/actions';

interface TeacherOpt { id: string; name: string }

const EMPTY: CategoryFormInput = { name: '', description: '', image: '', featured: false, enabled: true, pinnedTeacherIds: [] };

/** Admin CRUD for browse categories: create/edit (+image upload), reorder, feature, delete. */
export default function CategoriesManager({ categories, teachers }: { categories: Category[]; teachers: TeacherOpt[] }) {
    const router = useRouter();
    const [form, setForm] = useState<CategoryFormInput>(EMPTY);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isEditing = !!form.id;

    function edit(cat: Category) {
        setError(null);
        setForm({
            id: cat.id, name: cat.name, description: cat.description ?? '', image: cat.image ?? '',
            featured: !!cat.featured, enabled: cat.enabled !== false, pinnedTeacherIds: cat.pinnedTeacherIds ?? [],
        });
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function uploadImage(file: File) {
        if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }
        setUploading(true); setError(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await uploadCategoryImageAction(fd);
            if (res.error) { setError(res.error); return; }
            if (res.url) setForm((f) => ({ ...f, image: res.url! }));
        } catch (e) {
            setError((e as Error)?.message ?? 'Upload failed.');
        } finally {
            setUploading(false);
        }
    }

    async function save() {
        setBusy(true); setError(null);
        const res = await saveCategoryAction(form);
        setBusy(false);
        if (res.error) { setError(res.error); return; }
        setForm(EMPTY);
        router.refresh();
    }

    async function remove(id: string) {
        if (!confirm('Delete this category? Content tagged with it stays, but the category disappears from browse.')) return;
        await deleteCategoryAction(id);
        router.refresh();
    }

    async function move(index: number, dir: -1 | 1) {
        const next = [...categories];
        const j = index + dir;
        if (j < 0 || j >= next.length) return;
        [next[index], next[j]] = [next[j], next[index]];
        await reorderCategoriesAction(next.map((c) => c.id));
        router.refresh();
    }

    function togglePin(id: string) {
        setForm((f) => {
            const set = new Set(f.pinnedTeacherIds ?? []);
            set.has(id) ? set.delete(id) : set.add(id);
            return { ...f, pinnedTeacherIds: [...set] };
        });
    }

    return (
        <div className="space-y-8">
            {/* Editor */}
            <section className="card space-y-4">
                <h2 className="text-lg font-semibold">{isEditing ? 'Edit category' : 'New category'}</h2>
                {error && (
                    <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium">Name</span>
                        <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Mathematics" />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium">Short description</span>
                        <input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional tagline" />
                    </label>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="h-20 w-32 overflow-hidden rounded-lg border border-light-border bg-light-bg dark:border-dark-border dark:bg-dark-bg">
                        {form.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={form.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-light-subtle dark:text-dark-subtle">No image</div>
                        )}
                    </div>
                    <label className="text-sm">
                        <span className="mb-1 block font-medium">Category image</span>
                        <input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
                        {uploading && <span className="ml-2 text-xs text-light-subtle">Uploading…</span>}
                    </label>
                </div>

                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} /> Featured on homepage</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled !== false} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} /> Visible publicly</label>
                </div>

                {teachers.length > 0 && (
                    <div>
                        <span className="mb-2 block text-sm font-medium">Pin teachers first (optional)</span>
                        <div className="flex flex-wrap gap-2">
                            {teachers.map((t) => {
                                const on = (form.pinnedTeacherIds ?? []).includes(t.id);
                                return (
                                    <button key={t.id} type="button" onClick={() => togglePin(t.id)}
                                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? 'border-primary bg-primary text-white' : 'border-light-border hover:border-primary dark:border-dark-border'}`}>
                                        {t.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <button type="button" onClick={save} disabled={busy || uploading} className="btn-primary">
                        {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Add category'}
                    </button>
                    {isEditing && <button type="button" onClick={() => { setForm(EMPTY); setError(null); }} className="btn-secondary">Cancel</button>}
                </div>
            </section>

            {/* List */}
            <section className="space-y-2">
                <h2 className="text-lg font-semibold">Categories ({categories.length})</h2>
                {categories.length === 0 ? (
                    <p className="card text-sm text-light-subtle dark:text-dark-subtle">No categories yet — add your first above.</p>
                ) : (
                    <ul className="space-y-2">
                        {categories.map((cat, i) => (
                            <li key={cat.id} className="card flex items-center gap-4 py-3">
                                <div className="flex flex-col gap-1">
                                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-xs text-light-subtle hover:text-primary disabled:opacity-30">▲</button>
                                    <button type="button" onClick={() => move(i, 1)} disabled={i === categories.length - 1} className="text-xs text-light-subtle hover:text-primary disabled:opacity-30">▼</button>
                                </div>
                                <div className="h-12 w-16 overflow-hidden rounded-md bg-light-bg dark:bg-dark-bg">
                                    {cat.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={cat.image} alt="" className="h-full w-full object-cover" />
                                    ) : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{cat.name}</p>
                                    <p className="truncate text-xs text-light-subtle dark:text-dark-subtle">/{cat.slug}</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    {cat.featured && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Featured</span>}
                                    {cat.enabled === false && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">Hidden</span>}
                                </div>
                                <button type="button" onClick={() => edit(cat)} className="text-sm font-medium text-primary hover:underline">Edit</button>
                                <button type="button" onClick={() => remove(cat.id)} className="text-sm font-medium text-red-600 hover:underline">Delete</button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
