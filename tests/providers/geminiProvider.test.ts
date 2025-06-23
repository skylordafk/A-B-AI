import { describe, it, expect } from 'vitest';
import { geminiProvider } from '../../apps/main/src/providers/gemini';

describe('Gemini Provider', () => {
  it('should have correct provider metadata', () => {
    expect(geminiProvider.id).toBe('gemini');
    expect(geminiProvider.label).toBe('Gemini');
  });

  it('should return expected models from listModels', () => {
    const models = geminiProvider.listModels();

    expect(models).toHaveLength(2);

    const proThinking = models.find((m) => m.id === 'models/gemini-2.5-pro-thinking');
    expect(proThinking).toBeDefined();
    expect(proThinking?.name).toBe('Gemini 2.5 Pro Thinking');
    expect(proThinking?.contextSize).toBe(2097152);
    expect(proThinking?.pricePrompt).toBe(1.25);
    expect(proThinking?.priceCompletion).toBe(10.0);

    const flashPreview = models.find((m) => m.id === 'models/gemini-2.5-flash-preview');
    expect(flashPreview).toBeDefined();
    expect(flashPreview?.name).toBe('Gemini 2.5 Flash Preview');
    expect(flashPreview?.contextSize).toBe(1048576);
    expect(flashPreview?.pricePrompt).toBe(0.15);
    expect(flashPreview?.priceCompletion).toBe(0.6);
  });
});
