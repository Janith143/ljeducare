'use client';

import { signOutEverywhere } from '@/providers/AuthProvider';

export default function SignOutButton() {
    return (
        <button type="button" onClick={() => void signOutEverywhere()} className="btn-secondary px-3 py-1.5 text-xs">
            Sign out
        </button>
    );
}
