import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
