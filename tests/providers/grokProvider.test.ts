import { describe, it, expect } from 'vitest';
import { grokProvider } from '../../apps/main/src/providers/grok';

describe('Grok Provider', () => {
  it('should have correct provider metadata', () => {
    expect(grokProvider.id).toBe('grok');
    expect(grokProvider.label).toBe('Grok 3');
  });

  it('should return expected models from listModels', () => {
    const models = grokProvider.listModels();

    expect(models).toHaveLength(2);

    const grok3 = models.find((m) => m.id === 'grok-3');
    expect(grok3).toBeDefined();
    expect(grok3?.name).toBe('Grok 3');
    expect(grok3?.contextSize).toBe(128_000);
    expect(grok3?.pricePrompt).toBe(-1); // flat pricing
    expect(grok3?.priceCompletion).toBe(-1); // flat pricing

    const grok3Mini = models.find((m) => m.id === 'grok-3-mini');
    expect(grok3Mini).toBeDefined();
    expect(grok3Mini?.name).toBe('Grok 3 Mini');
    expect(grok3Mini?.contextSize).toBe(64_000);
    expect(grok3Mini?.pricePrompt).toBe(-1); // flat pricing
    expect(grok3Mini?.priceCompletion).toBe(-1); // flat pricing
  });
});
