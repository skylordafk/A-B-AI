import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import type { ModelDefinition } from '../shared/types';

describe('Model Pricing Data', () => {
  // New centralized model data structure
  const models: ModelDefinition[] = JSON.parse(readFileSync('./data/models.json', 'utf-8'));

  it('should have valid pricing for all models', () => {
    models.forEach((model) => {
      // Skip checking if model uses free pricing (0 values)
      if (model.pricing.prompt === 0 && model.pricing.completion === 0) {
        return;
      }

      expect(model.pricing, `Model ${model.id} should have pricing object`).toBeDefined();
      expect(
        model.pricing.prompt,
        `Model ${model.id} should have prompt pricing`
      ).toBeGreaterThanOrEqual(0);
      expect(
        model.pricing.completion,
        `Model ${model.id} should have completion pricing`
      ).toBeGreaterThanOrEqual(0);
    });
  });

  it('should have valid provider assignments', () => {
    const validProviders = ['openai', 'anthropic', 'grok', 'gemini'];

    models.forEach((model) => {
      expect(validProviders, `Model ${model.id} should have valid provider`).toContain(
        model.provider
      );
    });
  });

  it('should have models for each provider', () => {
    const providerCounts = models.reduce(
      (acc, model) => {
        acc[model.provider] = (acc[model.provider] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    expect(providerCounts.openai, 'Should have OpenAI models').toBeGreaterThan(0);
    expect(providerCounts.anthropic, 'Should have Anthropic models').toBeGreaterThan(0);
    expect(providerCounts.grok, 'Should have Grok models').toBeGreaterThan(0);
    expect(providerCounts.gemini, 'Should have Gemini models').toBeGreaterThan(0);
  });

  it('should have valid features array', () => {
    const validFeatures = ['web_search', 'extended_thinking', 'prompt_caching', 'json_mode'];

    models.forEach((model) => {
      expect(Array.isArray(model.features), `Model ${model.id} should have features array`).toBe(
        true
      );

      model.features.forEach((feature) => {
        expect(validFeatures, `Model ${model.id} has invalid feature: ${feature}`).toContain(
          feature
        );
      });
    });
  });
});
