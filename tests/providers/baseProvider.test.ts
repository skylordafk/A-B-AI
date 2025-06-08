import { describe, it, expect } from 'vitest';
import { openaiProvider } from '../../apps/main/src/providers/openai';
import { anthropicProvider } from '../../apps/main/src/providers/anthropic';
import { grokProvider } from '../../apps/main/src/providers/grok';
import { geminiProvider } from '../../apps/main/src/providers/gemini';

describe('BaseProvider implementations', () => {
  const providers = [
    { name: 'OpenAI', provider: openaiProvider },
    { name: 'Anthropic', provider: anthropicProvider },
    { name: 'Grok', provider: grokProvider },
    { name: 'Gemini', provider: geminiProvider },
  ];

  providers.forEach(({ name, provider }) => {
    describe(`${name} provider`, () => {
      it('should implement listModels', () => {
        expect(typeof provider.listModels).toBe('function');
      });

      it('should return at least one model from listModels', () => {
        const models = provider.listModels();
        expect(Array.isArray(models)).toBe(true);
        expect(models.length).toBeGreaterThanOrEqual(1);
      });

      it('should return valid ModelMeta objects', () => {
        const models = provider.listModels();
        models.forEach((model) => {
          expect(model).toHaveProperty('id');
          expect(model).toHaveProperty('name');
          expect(model).toHaveProperty('description');
          expect(model).toHaveProperty('contextSize');
          expect(model).toHaveProperty('pricePrompt');
          expect(model).toHaveProperty('priceCompletion');

          expect(typeof model.id).toBe('string');
          expect(typeof model.name).toBe('string');
          expect(typeof model.description).toBe('string');
          expect(typeof model.contextSize).toBe('number');
          expect(typeof model.pricePrompt).toBe('number');
          expect(typeof model.priceCompletion).toBe('number');
        });
      });
    });
  });
});
