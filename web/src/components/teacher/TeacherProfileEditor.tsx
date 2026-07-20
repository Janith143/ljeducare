'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { StaffMember } from '@ljeducare/shared';
import { saveMyTeacherProfileAction, uploadTeacherPhotoAction } from '@/app/teacher/profile/actions';

/** A small add/remove/reorder editor for a plain string[] (subjects, qualifications, …). */
function StringList({
    label,
    help,
    placeholder,
    value,
    onChange,
}: {
    label: string;
    help?: string;
    placeholder?: string;
    value: string[];
    onChange: (v: string[]) => void;
}) {
    const set = (i: number, v: string) => onChange(value.map((x, j) => (j === i ? v : x)));
    return (
        <div className="space-y-2">
            <span className="block text-sm font-medium">{label}</span>
            {help && <p className="text-xs text-light-subtle dark:text-dark-subtle">{help}</p>}
            <div className="space-y-2">
                {value.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <input className="input" value={item} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} />
                        <button
                            type="button"
                            onClick={() => onChange(value.filter((_, j) => j !== i))}
                            className="shrink-0 text-xs font-medium text-red-600 hover:underline"
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </div>
            <button type="button" onClick={() => onChange([...value, ''])} className="btn-secondary text-xs">
                + Add
            </button>
        </div>
    );
}

interface EditableStaff extends Partial<StaffMember> {
    id?: string;
    slug?: string;
    commissionRate?: number;
    email?: string;
}

/** Teacher self-service profile editor — the hybridLMS-style public teacher fields. */
export default function TeacherProfileEditor({ staff }: { staff: EditableStaff | null }) {
    const router = useRouter();
    const [name, setName] = useState(staff?.name ?? '');
    const [tagline, setTagline] = useState(staff?.tagline ?? '');
    const [bio, setBio] = useState(staff?.bio ?? '');
    const [subjects, setSubjects] = useState<string[]>(staff?.subjects ?? []);
    const [qualifications, setQualifications] = useState<string[]>(staff?.qualifications ?? []);
    const [languages, setLanguages] = useState<string[]>(staff?.languages ?? []);
    const [achievements, setAchievements] = useState<string[]>(staff?.achievements ?? []);
    const [experienceYears, setExperienceYears] = useState<number>(staff?.experienceYears ?? 0);
    const [profileImage, setProfileImage] = useState(staff?.profileImage ?? '');
    const [isPublished, setIsPublished] = useState(staff?.isPublished === true);

    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function uploadPhoto(file: File) {
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be under 5 MB.');
            return;
        }
        setUploading(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await uploadTeacherPhotoAction(fd);
            if (res.error) setError(res.error);
            else if (res.url) setProfileImage(res.url);
        } catch (e) {
            setError((e as Error)?.message ?? 'Upload failed.');
        } finally {
            setUploading(false);
        }
    }

    async function save() {
        setBusy(true);
        setError(null);
        setSaved(false);
        const res = await saveMyTeacherProfileAction({
            name,
            tagline,
            bio,
            subjects,
            qualifications,
            languages,
            achievements,
            experienceYears,
            profileImage,
            isPublished,
        });
        setBusy(false);
        if (res.error) {
            setError(res.error);
            return;
        }
        setSaved(true);
        router.refresh();
    }

    return (
        <section className="card space-y-5">
            <div>
                <h2 className="text-lg font-semibold">My public profile</h2>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    This is what students see on your teacher page and next to your classes and courses.
                </p>
            </div>

            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </p>
            )}
            {saved && (
                <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                    Saved.
                    {isPublished && staff?.slug && (
                        <>
                            {' '}
                            <Link href={`/teachers/${staff.slug}`} target="_blank" className="font-medium underline">
                                View your public profile ↗
                            </Link>
                        </>
                    )}
                </p>
            )}

            {/* Photo */}
            <div className="flex flex-wrap items-start gap-4">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-primary/10 ring-2 ring-primary/20">
                    {profileImage ? (
                        <img src={profileImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                            {(name || '?').slice(0, 1).toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="min-w-[14rem] flex-1 space-y-1">
                    <span className="block text-sm font-medium">Profile photo</span>
                    <input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        className="block w-full text-xs"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadPhoto(f);
                        }}
                    />
                    {uploading && <span className="text-xs text-light-subtle">Uploading…</span>}
                    {profileImage && !uploading && (
                        <button type="button" onClick={() => setProfileImage('')} className="text-xs font-medium text-red-600 hover:underline">
                            Remove photo
                        </button>
                    )}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">Name</span>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">Years of experience</span>
                    <input
                        className="input"
                        type="number"
                        min={0}
                        max={80}
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(Number(e.target.value))}
                    />
                </label>
            </div>

            <label className="block">
                <span className="mb-1 block text-sm font-medium">Tagline</span>
                <input className="input" value={tagline} maxLength={160} placeholder="e.g. A/L Physics · 15 years" onChange={(e) => setTagline(e.target.value)} />
            </label>

            <label className="block">
                <span className="mb-1 block text-sm font-medium">About you</span>
                <textarea className="input" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell students about your teaching style and background." />
            </label>

            <StringList label="Subjects" placeholder="e.g. Physics" value={subjects} onChange={setSubjects}
                help="Also used to place you under the right subject on the homepage." />
            <StringList label="Qualifications" placeholder="e.g. BSc (Hons) Physics, University of Colombo" value={qualifications} onChange={setQualifications} />
            <StringList label="Languages" placeholder="e.g. Sinhala" value={languages} onChange={setLanguages} />
            <StringList label="Achievements" placeholder="e.g. 20+ island-rank students" value={achievements} onChange={setAchievements} />

            <label className="flex items-center gap-2 rounded-lg border border-light-border p-3 text-sm font-medium dark:border-dark-border">
                <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                Show my profile publicly (list me on the Teachers page and next to my classes)
            </label>

            {/* Read-only, institute-managed */}
            <div className="rounded-lg border border-light-border p-3 text-xs text-light-subtle dark:border-dark-border dark:text-dark-subtle">
                <p>Email: {staff?.email ?? '—'}</p>
                {staff?.commissionRate !== undefined && <p>Commission: {staff.commissionRate}% (set by the institute)</p>}
            </div>

            <button type="button" onClick={save} disabled={busy || uploading} className="btn-primary">
                {busy ? 'Saving…' : 'Save profile'}
            </button>
        </section>
    );
}
