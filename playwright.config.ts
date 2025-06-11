import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/playwright',
  // Use a dedicated tsconfig so Playwright compiles the specs as native ES-modules (no require())
  tsconfig: './tests/playwright/tsconfig.json',
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
});
