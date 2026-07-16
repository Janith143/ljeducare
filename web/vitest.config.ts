import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Pure-TS unit tests (money math, landing content model + CMS schema).
 * The aliases mirror tsconfig paths so tests can import the same modules the app does.
 */
export default defineConfig({
    test: {
        include: ['src/**/*.test.{ts,tsx}'],
        environment: 'node',
    },
    // tsconfig sets jsx:"preserve" for Next to handle; tests need it compiled.
    esbuild: { jsx: 'automatic' },
    resolve: {
        alias: {
            '@ljeducare/shared': path.resolve(root, 'src/shared/index.ts'),
            '@': path.resolve(root, 'src'),
        },
    },
});
