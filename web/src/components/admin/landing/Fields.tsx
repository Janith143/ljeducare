'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { uploadLandingImageAction } from '@/app/admin/landing-page/actions';
import type { Field } from './schema';

type Obj = Record<string, unknown>;

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

function Help({ text }: { text?: string }) {
    if (!text) return null;
    return <span className="mt-1 block text-xs text-light-subtle dark:text-dark-subtle">{text}</span>;
}

/** Upload-or-paste image control with a live preview. */
function ImageInput({
    value,
    onChange,
    label,
    help,
}: {
    value: string;
    onChange: (v: string) => void;
    label: string;
    help?: string;
}) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function upload(file: File) {
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be under 5 MB.');
            return;
        }
        setUploading(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await uploadLandingImageAction(fd);
            if (res.error) setError(res.error);
            else if (res.url) onChange(res.url);
        } catch (e) {
            setError((e as Error)?.message ?? 'Upload failed.');
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="space-y-2">
            <span className="block text-sm font-medium">{label}</span>
            <div className="flex flex-wrap items-start gap-3">
                <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-light-border bg-light-background dark:border-dark-border dark:bg-dark-background">
                    {value ? (
                        <img src={value} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-light-subtle dark:text-dark-subtle">
                            No image
                        </div>
                    )}
                </div>
                <div className="min-w-[14rem] flex-1 space-y-2">
                    <input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        className="block w-full text-xs"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) upload(f);
                        }}
                    />
                    <input
                        className="input text-xs"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="…or paste an image URL"
                    />
                    {uploading && <span className="text-xs text-light-subtle">Uploading…</span>}
                    {value && (
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="text-xs font-medium text-red-600 hover:underline"
                        >
                            Remove image
                        </button>
                    )}
                    {error && (
                        <p role="alert" className="text-xs text-red-600">
                            {error}
                        </p>
                    )}
                </div>
            </div>
            <Help text={help} />
        </div>
    );
}

/** Editor for a plain string[] (rotating words, chips, marquee…). */
function StringsInput({
    value,
    onChange,
    label,
    help,
    placeholder,
}: {
    value: string[];
    onChange: (v: string[]) => void;
    label: string;
    help?: string;
    placeholder?: string;
}) {
    const items = value ?? [];
    const set = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
    const move = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= items.length) return;
        const next = [...items];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };

    return (
        <div className="space-y-2">
            <span className="block text-sm font-medium">{label}</span>
            <Help text={help} />
            <div className="space-y-2">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <input className="input" value={item} onChange={(e) => set(i, e.target.value)} placeholder={placeholder} />
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                            className="text-xs text-light-subtle hover:text-primary disabled:opacity-30" aria-label="Move up">▲</button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1}
                            className="text-xs text-light-subtle hover:text-primary disabled:opacity-30" aria-label="Move down">▼</button>
                        <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
                            className="text-xs font-medium text-red-600 hover:underline">Remove</button>
                    </div>
                ))}
            </div>
            <button type="button" onClick={() => onChange([...items, ''])} className="btn-secondary text-xs">
                + Add
            </button>
        </div>
    );
}

/** Repeatable object list: add / remove / reorder, with nested fields. */
function ListInput({
    field,
    value,
    onChange,
}: {
    field: Extract<Field, { kind: 'list' }>;
    value: Obj[];
    onChange: (v: Obj[]) => void;
}) {
    const items = Array.isArray(value) ? value : [];
    const setItem = (i: number, next: Obj) => onChange(items.map((x, j) => (j === i ? next : x)));
    const move = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= items.length) return;
        const next = [...items];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };

    return (
        <div className="space-y-3">
            <div>
                <span className="block text-sm font-medium">
                    {field.label} ({items.length})
                </span>
                <Help text={field.help} />
            </div>

            {items.map((item, i) => (
                <div key={i} className="rounded-lg border border-light-border p-3 dark:border-dark-border">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {field.itemTitle(item, i) || `Item ${i + 1}`}
                        </span>
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                            className="text-xs text-light-subtle hover:text-primary disabled:opacity-30" aria-label="Move up">▲</button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1}
                            className="text-xs text-light-subtle hover:text-primary disabled:opacity-30" aria-label="Move down">▼</button>
                        <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
                            className="text-xs font-medium text-red-600 hover:underline">Remove</button>
                    </div>
                    <FieldGrid
                        fields={field.fields}
                        value={item}
                        onChange={(next) => setItem(i, next)}
                    />
                </div>
            ))}

            {(field.max === undefined || items.length < field.max) && (
                <button type="button" onClick={() => onChange([...items, field.makeItem()])} className="btn-secondary text-sm">
                    + Add {field.label.replace(/s$/, '').toLowerCase()}
                </button>
            )}
        </div>
    );
}

/** Render one field bound to `obj[field.key]`. */
export function FieldInput({
    field,
    obj,
    onChange,
}: {
    field: Field;
    obj: Obj;
    onChange: (next: Obj) => void;
}) {
    const set = (v: unknown) => onChange({ ...obj, [field.key]: v });
    const raw = obj[field.key];

    switch (field.kind) {
        case 'text':
            return (
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">{field.label}</span>
                    <input className="input" value={str(raw)} placeholder={field.placeholder} onChange={(e) => set(e.target.value)} />
                    <Help text={field.help} />
                </label>
            );
        case 'textarea':
            return (
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">{field.label}</span>
                    <textarea className="input" rows={field.rows ?? 3} value={str(raw)} placeholder={field.placeholder} onChange={(e) => set(e.target.value)} />
                    <Help text={field.help} />
                </label>
            );
        case 'number':
            return (
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">{field.label}</span>
                    <input
                        className="input"
                        type="number"
                        value={typeof raw === 'number' ? raw : ''}
                        onChange={(e) => set(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                    <Help text={field.help} />
                </label>
            );
        case 'date':
            return (
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">{field.label}</span>
                    <input className="input" type="date" value={str(raw)} onChange={(e) => set(e.target.value)} />
                    <Help text={field.help} />
                </label>
            );
        case 'select':
            return (
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">{field.label}</span>
                    <select className="input" value={str(raw)} onChange={(e) => set(e.target.value)}>
                        {field.options.map((o) => (
                            <option key={o} value={o}>
                                {o}
                            </option>
                        ))}
                    </select>
                    <Help text={field.help} />
                </label>
            );
        case 'bool':
            return (
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                            type="checkbox"
                            checked={typeof raw === 'boolean' ? raw : field.defaultOn !== false}
                            onChange={(e) => set(e.target.checked)}
                        />
                        {field.label}
                    </label>
                    <Help text={field.help} />
                </div>
            );
        case 'icon':
            return (
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">{field.label}</span>
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-light-border text-lg dark:border-dark-border">
                            <i className={`ph ${str(raw) || 'ph-question'}`} />
                        </span>
                        <input className="input" value={str(raw)} placeholder="ph-atom" onChange={(e) => set(e.target.value)} />
                    </div>
                    <Help text={field.help} />
                </label>
            );
        case 'image':
            return <ImageInput label={field.label} help={field.help} value={str(raw)} onChange={set} />;
        case 'strings':
            return (
                <StringsInput
                    label={field.label}
                    help={field.help}
                    placeholder={field.placeholder}
                    value={Array.isArray(raw) ? (raw as string[]) : []}
                    onChange={set}
                />
            );
        case 'list':
            return <ListInput field={field} value={Array.isArray(raw) ? (raw as Obj[]) : []} onChange={set} />;
    }
}

/**
 * Lay out a set of fields: simple inputs pair up two-per-row, while images,
 * lists and string editors take the full width.
 */
export function FieldGrid({
    fields,
    value,
    onChange,
}: {
    fields: Field[];
    value: Obj;
    onChange: (next: Obj) => void;
}) {
    const isWide = (f: Field) =>
        f.kind === 'list' || f.kind === 'strings' || f.kind === 'image' || f.kind === 'textarea' || ('wide' in f && f.wide);

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
                <div key={f.key} className={isWide(f) ? 'sm:col-span-2' : ''}>
                    <FieldInput field={f} obj={value} onChange={onChange} />
                </div>
            ))}
        </div>
    );
}
