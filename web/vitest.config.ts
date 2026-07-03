import { defineConfig } from 'vitest/config';

/** Runs the pure-TS unit tests under src/shared (money math). */
export default defineConfig({
    test: {
        include: ['src/shared/**/*.test.ts'],
        environment: 'node',
    },
});
