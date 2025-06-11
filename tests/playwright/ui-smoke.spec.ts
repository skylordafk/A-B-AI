import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// Polyfill __dirname in ESM scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve path to built UI index.html (works in ESM)
const projectRoot = path.resolve(__dirname, '../../');
const indexPath = path.join(projectRoot, 'apps/ui/dist/index.html');

const indexUrl = 'file://' + indexPath.replace(/\\/g, '/');

/**
 * Basic smoke-test: launch browser and ensure UI renders root element.
 */

test('UI loads without error', async ({ page }) => {
  await page.goto(indexUrl);
  // Root container should exist in DOM after the bundle executes.
  await expect(page.locator('#root')).toBeAttached();
});
