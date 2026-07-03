import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Shared workspace package — transpile its output for the app bundle.
    transpilePackages: ['@ljeducare/shared'],
    // firebase-admin must stay a Node.js external in server components.
    serverExternalPackages: ['firebase-admin'],
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
            { protocol: 'https', hostname: '*.firebasestorage.app' },
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
        ],
    },
};

export default nextConfig;
