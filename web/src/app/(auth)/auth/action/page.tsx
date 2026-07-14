import type { Metadata } from 'next';
import AuthActionClient from '@/components/auth/AuthActionClient';

export const metadata: Metadata = { title: 'Account action', robots: { index: false } };

export default function AuthActionPage() {
    return <AuthActionClient />;
}
