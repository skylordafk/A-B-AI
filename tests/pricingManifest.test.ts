import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { openaiProvider } from '../apps/main/src/providers/openai';
import { anthropicProvider } from '../apps/main/src/providers/anthropic';
import { grokProvider } from '../apps/main/src/providers/grok';
import { geminiProvider } from '../apps/main/src/providers/gemini';

describe('Model Pricing Manifest', () => {
  const pricingManifest = JSON.parse(readFileSync('./modelPricing.json', 'utf-8'));

  const providers = [
    { name: 'openai', provider: openaiProvider },
    { name: 'anthropic', provider: anthropicProvider },
    { name: 'grok', provider: grokProvider },
    { name: 'gemini', provider: geminiProvider },
  ];

  providers.forEach(({ name, provider }) => {
    describe(`${name} provider models`, () => {
      it('should have pricing entries for all models', () => {
        const models = provider.listModels();

        models.forEach((model) => {
          // Skip checking if model uses flat pricing (-1 values)
          if (model.pricePrompt === -1 && model.priceCompletion === -1) {
            return;
          }

          expect(
            pricingManifest[name],
            `Pricing manifest should have entry for provider ${name}`
          ).toBeDefined();

          expect(
            pricingManifest[name][model.id],
            `Pricing manifest should have entry for model ${model.id} in provider ${name}`
          ).toBeDefined();

          expect(pricingManifest[name][model.id]).toHaveProperty('prompt');
          expect(pricingManifest[name][model.id]).toHaveProperty('completion');
        });
      });
    });
  });
});
