import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    // To mimic jest's `testMatch`
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['tests/playwright/**'],
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@main': path.resolve(__dirname, './apps/main/src'),
      '@ui': path.resolve(__dirname, './apps/ui/src'),
    },
  },
});
