import { describe, it, expect } from 'vitest';
import { geminiProvider } from '../../apps/main/src/providers/gemini';

describe('Gemini Provider', () => {
  it('should have correct provider metadata', () => {
    expect(geminiProvider.id).toBe('gemini');
    expect(geminiProvider.label).toBe('Gemini 2.5 Pro');
  });

  it('should return expected models from listModels', () => {
    const models = geminiProvider.listModels();

    expect(models).toHaveLength(2);

    const proThinking = models.find((m) => m.id === 'models/gemini-2.5-pro-thinking');
    expect(proThinking).toBeDefined();
    expect(proThinking?.name).toBe('Gemini 2.5 Pro-Thinking');
    expect(proThinking?.contextSize).toBe(1_000_000);
    expect(proThinking?.pricePrompt).toBe(0.0008);
    expect(proThinking?.priceCompletion).toBe(0.0008);

    const flashFast = models.find((m) => m.id === 'models/gemini-1.5-flash-fast');
    expect(flashFast).toBeDefined();
    expect(flashFast?.name).toBe('Gemini 1.5 Flash-Fast');
    expect(flashFast?.contextSize).toBe(1_000_000);
    expect(flashFast?.pricePrompt).toBe(0.00035);
    expect(flashFast?.priceCompletion).toBe(0.00035);
  });
});
