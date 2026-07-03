'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { callFunction } from '@/lib/firebase/client';

export interface CourseOption {
    id: string;
    title: string;
    /** Students enrolled in this course: [uid, name] pairs. */
    students: [string, string][];
}

/** Issue a certificate: pick a course, then one of its enrolled students. */
export default function IssueCertificateForm({ courses }: { courses: CourseOption[] }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
    const [studentId, setStudentId] = useState('');
    const [message, setMessage] = useState<{ ok?: boolean; text: string } | null>(null);

    const course = courses.find((c) => c.id === courseId);

    function issue() {
        if (!courseId || !studentId) return;
        startTransition(async () => {
            setMessage(null);
            try {
                const res = await callFunction<
                    { studentId: string; courseId: string },
                    { verificationId: string; alreadyIssued?: boolean }
                >('issueCertificate', { studentId, courseId });
                setMessage({
                    ok: true,
                    text: res.alreadyIssued
                        ? `Already issued — ID ${res.verificationId}`
                        : `Certificate issued — ID ${res.verificationId}`,
                });
                router.refresh();
            } catch (e: unknown) {
                setMessage({ text: (e as Error)?.message ?? 'Issuing failed.' });
            }
        });
    }

    return (
        <section className="card space-y-3">
            <h2 className="font-semibold">Issue a certificate</h2>
            {message && (
                <p role="status" className={`rounded-lg p-2 text-sm ${message.ok ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
                    {message.text}
                </p>
            )}
            <select
                value={courseId}
                onChange={(e) => {
                    setCourseId(e.target.value);
                    setStudentId('');
                }}
                className="input"
            >
                {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                ))}
            </select>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="input">
                <option value="">— Select an enrolled student —</option>
                {(course?.students ?? []).map(([uid, name]) => (
                    <option key={uid} value={uid}>{name}</option>
                ))}
            </select>
            <button type="button" onClick={issue} disabled={pending || !studentId} className="btn-primary w-full">
                {pending ? 'Issuing…' : 'Issue certificate'}
            </button>
        </section>
    );
}
