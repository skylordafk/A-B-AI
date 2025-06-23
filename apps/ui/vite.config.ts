import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  base: './',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../shared'),
      '@main': path.resolve(__dirname, '../main/src'), // Alias for main process if needed
      '@ui': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['@dqbd/tiktoken'],
  },
});
