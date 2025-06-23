import fs from 'fs';
import path from 'path';
import { LLMModel } from '../types/ModelPricing';

let CACHE: LLMModel[] | null = null;

export const loadPricing = (): LLMModel[] => {
  if (CACHE) return CACHE;

  // Try multiple paths in order of preference for maximum compatibility
  const possiblePaths = [
    // Development paths
    path.join(__dirname, '../../data/model-pricing.json'),
    path.resolve(process.cwd(), 'data', 'model-pricing.json'),
    path.resolve(process.cwd(), '../../data/model-pricing.json'),

    // Fallback to app root (for tests and other environments)
    path.join(__dirname, '../../../data/model-pricing.json'),
    path.join(__dirname, '../../../../data/model-pricing.json'),
  ];

  // Only add production paths if resourcesPath exists (in packaged Electron app)
  if (process.resourcesPath) {
    possiblePaths.push(
      path.join(process.resourcesPath, 'data', 'model-pricing.json'),
      path.join(process.resourcesPath, 'app', 'data', 'model-pricing.json'),
      path.join(process.resourcesPath, 'app.asar', 'data', 'model-pricing.json')
    );
  }

  let lastError: Error | null = null;

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        console.log(`[loadPricing] Loading from: ${filePath}`);
        const data = fs.readFileSync(filePath, 'utf8');
        CACHE = JSON.parse(data) as LLMModel[];
        console.log(`[loadPricing] Successfully loaded ${CACHE.length} models`);
        return CACHE;
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`[loadPricing] Failed to load from ${filePath}:`, error);
    }
  }

  console.error(`[loadPricing] Failed to load pricing file from any path. Tried:`, possiblePaths);
  throw lastError || new Error('Could not find model-pricing.json in any expected location');
};

export const getModel = (id: string): LLMModel => {
  const models = loadPricing();

  // First, try a direct match. This works for `gpt-4o` and `models/gemini...`
  let m = models.find((model) => model.id === id);
  if (m) return m;

  // If no direct match, it might be a prefixed ID like `openai/gpt-4o`.
  // Strip the prefix and try again.
  if (id.includes('/')) {
    const idWithoutProvider = id.substring(id.indexOf('/') + 1);
    m = models.find((model) => model.id === idWithoutProvider);
    if (m) return m;
  }

  throw new Error(`Unknown model id: ${id}`);
};
