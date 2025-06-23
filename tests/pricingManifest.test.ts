import { describe, it, expect } from 'vitest';
import { loadPricing } from '../shared/utils/loadPricing';
import { LLMModel as ModelPricingDefinition } from '../shared/types/ModelPricing';

describe('Model Pricing Data', () => {
  const models: ModelPricingDefinition[] = loadPricing();

  it('should have valid pricing for all models', () => {
    for (const model of models) {
      expect(model.pricing).toBeDefined();
      expect(typeof model.pricing.prompt).toBe('number');
      expect(typeof model.pricing.completion).toBe('number');
      // All prices should be non-negative
      expect(model.pricing.prompt).toBeGreaterThanOrEqual(0);
      expect(model.pricing.completion).toBeGreaterThanOrEqual(0);
    }
  });

  it('should contain essential models', () => {
    const modelIds = models.map((m) => m.id);
    expect(modelIds).toContain('gpt-4o');
    expect(modelIds).toContain('claude-4-opus');
    expect(modelIds).toContain('models/gemini-2.5-flash-preview');
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
    const validFeatures = [
      'reasoning',
      'extended_thinking',
      'prompt_caching',
      'json_mode',
      'thinking',
    ];

    models.forEach((model) => {
      expect(Array.isArray(model.features), `Model ${model.id} should have features array`).toBe(
        true
      );

      model.features.forEach((feature: string) => {
        expect(validFeatures, `Model ${model.id} has invalid feature: ${feature}`).toContain(
          feature
        );
      });
    });
  });
});
