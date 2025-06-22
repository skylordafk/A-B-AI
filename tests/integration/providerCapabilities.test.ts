import { describe, it, expect } from 'vitest';
import { openaiProvider } from '../../apps/main/src/providers/openai';
import { anthropicProvider } from '../../apps/main/src/providers/anthropic';
import { geminiProvider } from '../../apps/main/src/providers/gemini';
import { grokProvider } from '../../apps/main/src/providers/grok';

describe('Provider Capabilities Integration', () => {
  const providers = [
    { name: 'OpenAI', provider: openaiProvider },
    { name: 'Anthropic', provider: anthropicProvider },
    { name: 'Gemini', provider: geminiProvider },
    { name: 'Grok', provider: grokProvider },
  ];

  providers.forEach(({ name, provider }) => {
    describe(`${name} Provider`, () => {
      it('should have getCapabilities method', () => {
        expect(typeof provider.getCapabilities).toBe('function');
      });

      it('should return valid capabilities object', () => {
        const capabilities = provider.getCapabilities();

        expect(capabilities).toBeDefined();
        expect(typeof capabilities.supportsJsonMode).toBe('boolean');
        expect(typeof capabilities.supportsBatchAPI).toBe('boolean');
        expect(typeof capabilities.supportsStreaming).toBe('boolean');
      });

      it('should have chat methods', () => {
        expect(typeof provider.chat).toBe('function');
        expect(typeof provider.chatWithHistory).toBe('function');
      });

      it('should have batch API methods if supported', () => {
        const capabilities = provider.getCapabilities();

        if (capabilities.supportsBatchAPI) {
          expect(typeof provider.submitBatch).toBe('function');
          expect(typeof provider.getBatchStatus).toBe('function');
          expect(typeof provider.retrieveBatchResults).toBe('function');
        }
      });
    });
  });

  it('should have consistent capability reporting', () => {
    // OpenAI should support batch API
    expect(openaiProvider.getCapabilities().supportsBatchAPI).toBe(true);

    // Check specific expected capabilities per provider
    expect(openaiProvider.getCapabilities().supportsStreaming).toBe(true);
    expect(anthropicProvider.getCapabilities().supportsStreaming).toBe(true);
    expect(geminiProvider.getCapabilities().supportsStreaming).toBe(false); // Gemini doesn't support streaming
    expect(grokProvider.getCapabilities().supportsStreaming).toBe(false); // Grok doesn't support streaming

    // Check JSON mode support per provider (varies by provider)
    expect(openaiProvider.getCapabilities().supportsJsonMode).toBe(true);
    expect(anthropicProvider.getCapabilities().supportsJsonMode).toBe(false); // Anthropic doesn't support JSON mode
    expect(geminiProvider.getCapabilities().supportsJsonMode).toBe(true);
    expect(grokProvider.getCapabilities().supportsJsonMode).toBe(false); // Grok doesn't support JSON mode
  });

  it('should handle batch operations for supported providers', async () => {
    const supportedProviders = providers.filter(
      ({ provider }) => provider.getCapabilities().supportsBatchAPI
    );

    // Test that batch methods exist and throw appropriate errors
    for (const { name: _name, provider } of supportedProviders) {
      if (provider.submitBatch) {
        // Should throw an error when called without API key
        await expect(provider.submitBatch([{ prompt: 'test', model: 'gpt-4o' }])).rejects.toThrow();
      }
    }
  });
});
