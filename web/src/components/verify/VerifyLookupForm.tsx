'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyLookupForm() {
    const router = useRouter();
    const [id, setId] = useState('');

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                const value = id.trim().toUpperCase();
                if (value) router.push(`/verify/${encodeURIComponent(value)}`);
            }}
            className="card flex gap-2 p-4"
        >
            <input
                value={id}
                onChange={(e) => setId(e.target.value.toUpperCase())}
                required
                placeholder="LJC-XXXX-XXXX"
                className="input flex-1 font-mono"
            />
            <button type="submit" className="btn-primary px-6">Verify</button>
        </form>
    );
}
