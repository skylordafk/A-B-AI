import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    environmentMatchGlobs: [['**/tests/components/**/*.test.tsx', 'jsdom']],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      'tests/playwright/**',
      'tests/license-e2e.test.js', // Standalone Node.js script, not a Vitest test
    ],
    include: ['tests/**/*.test.ts'],
  },
  testMatch: ['**/tests/ui/**/*.test.tsx'],
  testEnvironment: 'jsdom',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
