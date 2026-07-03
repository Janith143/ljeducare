import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
    // Pin the file-tracing root to web/ so the standalone output lands in the
    // right place on Firebase App Hosting even if a stray root lockfile exists
    // (otherwise Next infers the repo root and the adapter can't find the manifest).
    outputFileTracingRoot: appDir,
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
