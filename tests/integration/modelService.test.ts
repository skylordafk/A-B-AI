import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import type { ModelDefinition } from '../../shared/types';

describe('ModelService Integration', () => {
  // Test the models data directly since we can't easily mock Electron in tests
  const models: ModelDefinition[] = JSON.parse(readFileSync('./data/models.json', 'utf-8'));

  it('should load models from data/models.json', () => {
    expect(models).toBeDefined();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  it('should have models for each provider', () => {
    const providers = ['openai', 'anthropic', 'grok', 'gemini'] as const;

    providers.forEach((provider) => {
      const providerModels = models.filter((m) => m.provider === provider);
      expect(providerModels.length, `Should have models for ${provider}`).toBeGreaterThan(0);

      providerModels.forEach((model) => {
        expect(model.provider).toBe(provider);
      });
    });
  });

  it('should have unique model IDs', () => {
    const ids = models.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid pricing for models', () => {
    models.forEach((model) => {
      expect(model.pricing).toBeDefined();
      expect(model.pricing.prompt).toBeGreaterThanOrEqual(0);
      expect(model.pricing.completion).toBeGreaterThanOrEqual(0);
    });
  });

  it('should have valid features arrays', () => {
    const validFeatures = ['web_search', 'extended_thinking', 'prompt_caching', 'json_mode'];

    models.forEach((model) => {
      expect(Array.isArray(model.features)).toBe(true);

      model.features.forEach((feature) => {
        expect(validFeatures).toContain(feature);
      });
    });
  });

  it('should have required model properties', () => {
    models.forEach((model) => {
      expect(model.id).toBeDefined();
      expect(model.name).toBeDefined();
      expect(model.provider).toBeDefined();
      expect(model.description).toBeDefined();
      expect(model.contextSize).toBeGreaterThan(0);
      expect(model.pricing).toBeDefined();
      expect(Array.isArray(model.features)).toBe(true);
    });
  });

  it('should have models with JSON mode support', () => {
    const jsonModeModels = models.filter((m) => m.features.includes('json_mode'));
    expect(jsonModeModels.length).toBeGreaterThan(0);
  });
});
