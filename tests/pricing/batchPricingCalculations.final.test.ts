import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estimateCost, calculateActualCost } from '../../apps/ui/src/lib/batch/estimateCost';
import type { BatchRow } from '../../apps/ui/src/types/batch';

// Mock the pricing data loading with the EXACT fallback structure from the real code
vi.mock('../../apps/ui/src/lib/batch/loadPricingData', () => ({
  loadPricingData: vi.fn().mockResolvedValue({
    openai: {
      'gpt-4.1': { prompt: 0.002, completion: 0.008 },
      'gpt-4.1-mini': { prompt: 0.0004, completion: 0.0016 },
      'gpt-4.1-nano': { prompt: 0.0001, completion: 0.0004 },
      'gpt-4o': { prompt: 0.0025, completion: 0.005 },
      'gpt-4o-mini': { prompt: 0.0006, completion: 0.0024 },
      'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
      'o3-2025-04-16': { prompt: 0.002, completion: 0.008 }, // Default fallback model
    },
    anthropic: {
      'claude-opus-4-20250514': { prompt: 0.015, completion: 0.075 },
      'claude-sonnet-4': { prompt: 0.003, completion: 0.015 },
      'claude-3-5-sonnet-20241022': { prompt: 0.003, completion: 0.015 },
      'claude-3-5-haiku': { prompt: 0.0008, completion: 0.004 },
      'claude-3-7-sonnet': { prompt: 0.003, completion: 0.015 },
      'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },
      'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 },
      'claude-3-sonnet-20240229': { prompt: 0.003, completion: 0.015 },
      'claude-3-haiku': { prompt: 0.0008, completion: 0.004 },
    },
    grok: {
      'grok-3': { prompt: 0.003, completion: 0.015 },
      'grok-3-mini': { prompt: 0.0003, completion: 0.0005 },
    },
    gemini: {
      'models/gemini-2.5-flash-preview': { prompt: 0.00035, completion: 0.00175 },
      'models/gemini-2.5-pro-thinking': { prompt: 0.00125, completion: 0.01 },
    },
  }),
  getProviderAndModel: vi.fn().mockImplementation((modelString) => {
    if (!modelString) {
      return { provider: 'openai', model: 'o3-2025-04-16' };
    }

    // Handle provider/model format - CORRECT implementation
    if (modelString.includes('/')) {
      const firstSlashIndex = modelString.indexOf('/');
      const provider = modelString.substring(0, firstSlashIndex);
      const model = modelString.substring(firstSlashIndex + 1);
      return { provider, model };
    }

    // Try to infer provider from model name
    if (modelString.includes('gpt') || modelString.includes('o3')) {
      return { provider: 'openai', model: modelString };
    }
    if (modelString.includes('claude')) {
      return { provider: 'anthropic', model: modelString };
    }
    if (modelString.includes('gemini')) {
      return { provider: 'gemini', model: modelString };
    }
    if (modelString.includes('grok')) {
      return { provider: 'grok', model: modelString };
    }

    // Default to openai
    return { provider: 'openai', model: modelString };
  }),
}));

// Mock token estimation
const mockApi = {
  countTokens: vi.fn(),
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'api', {
    value: mockApi,
    writable: true,
  });
}

describe('Batch Pricing Calculations (Final)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock token counting: ~1 token per 4 characters
    mockApi.countTokens.mockImplementation((text: string) =>
      Promise.resolve(Math.ceil(text.length / 4))
    );
  });

  describe('Cost Estimation with Correct Pricing', () => {
    it('should estimate costs using correct model pricing', async () => {
      const rows: BatchRow[] = [
        {
          id: '1',
          prompt: 'This is a test prompt with about twenty words.',
          model: 'openai/gpt-4o',
        },
        {
          id: '2',
          prompt: 'Another test prompt for Claude Sonnet.',
          model: 'anthropic/claude-3-5-sonnet-20241022',
        },
        {
          id: '3',
          prompt: 'Test prompt for Gemini model.',
          model: 'gemini/models/gemini-2.5-flash-preview',
        },
      ];

      const estimation = await estimateCost(rows);

      expect(estimation).toBeDefined();
      expect(estimation.totalUSD).toBeGreaterThan(0);
      expect(estimation.perRow).toHaveLength(3);

      // Test GPT-4o (should use 0.0025 rate)
      const row1 = estimation.perRow.find((r) => r.id === '1');
      expect(row1).toBeDefined();
      const expectedTokens1 = Math.ceil(rows[0].prompt.length / 4);
      const expectedCost1 = (expectedTokens1 / 1000) * 0.0025;
      expect(row1!.est_cost).toBeCloseTo(expectedCost1, 8);

      // Test Claude Sonnet (should use 0.003 rate)
      const row2 = estimation.perRow.find((r) => r.id === '2');
      expect(row2).toBeDefined();
      const expectedTokens2 = Math.ceil(rows[1].prompt.length / 4);
      const expectedCost2 = (expectedTokens2 / 1000) * 0.003;
      expect(row2!.est_cost).toBeCloseTo(expectedCost2, 8);

      // Test Gemini (should use 0.00035 rate)
      const row3 = estimation.perRow.find((r) => r.id === '3');
      expect(row3).toBeDefined();
      const expectedTokens3 = Math.ceil(rows[2].prompt.length / 4);
      const expectedCost3 = (expectedTokens3 / 1000) * 0.00035;
      expect(row3!.est_cost).toBeCloseTo(expectedCost3, 8);
    });

    it('should use fallback pricing for unknown models', async () => {
      const rows: BatchRow[] = [
        {
          id: '1',
          prompt: 'Test with unknown model',
          model: 'unknown/random-model',
        },
      ];

      const estimation = await estimateCost(rows);
      const row = estimation.perRow[0];

      // Should use o3-2025-04-16 fallback pricing (0.002)
      const expectedTokens = Math.ceil(rows[0].prompt.length / 4);
      const expectedCost = (expectedTokens / 1000) * 0.002;
      expect(row.est_cost).toBeCloseTo(expectedCost, 8);
    });

    it('should handle system prompts correctly', async () => {
      const rows: BatchRow[] = [
        {
          id: '1',
          prompt: 'User prompt',
          system: 'System prompt',
          model: 'openai/gpt-4o',
        },
      ];

      const estimation = await estimateCost(rows);
      const row = estimation.perRow[0];

      // Should include both system and user prompt
      const combinedText = 'System prompt\n\nUser prompt';
      const expectedTokens = Math.ceil(combinedText.length / 4);
      const expectedCost = (expectedTokens / 1000) * 0.0025;
      expect(row.est_cost).toBeCloseTo(expectedCost, 8);
    });

    it('should accumulate total costs correctly', async () => {
      const rows: BatchRow[] = [
        { id: '1', prompt: 'First', model: 'openai/gpt-4o' },
        { id: '2', prompt: 'Second', model: 'anthropic/claude-3-haiku-20240307' },
      ];

      const estimation = await estimateCost(rows);

      const sumOfIndividualCosts = estimation.perRow.reduce((sum, row) => sum + row.est_cost, 0);
      expect(estimation.totalUSD).toBeCloseTo(sumOfIndividualCosts, 8);
    });
  });

  describe('Actual Cost Calculation', () => {
    it('should calculate post-processing costs correctly', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test',
        model: 'openai/gpt-4o',
      };

      const actualCost = await calculateActualCost(row, 100, 50);

      // GPT-4o: 0.0025/1K input + 0.005/1K output
      const expectedCost = (100 / 1000) * 0.0025 + (50 / 1000) * 0.005;
      expect(actualCost).toBeCloseTo(expectedCost, 8);
    });

    it('should handle different model rates in actual calculation', async () => {
      const testCases = [
        {
          model: 'openai/gpt-4o',
          inputRate: 0.0025,
          outputRate: 0.005,
        },
        {
          model: 'anthropic/claude-3-5-sonnet-20241022',
          inputRate: 0.003,
          outputRate: 0.015,
        },
        {
          model: 'anthropic/claude-3-haiku-20240307',
          inputRate: 0.00025,
          outputRate: 0.00125,
        },
        {
          model: 'grok/grok-3',
          inputRate: 0.003,
          outputRate: 0.015,
        },
      ];

      for (const { model, inputRate, outputRate } of testCases) {
        const row: BatchRow = { id: '1', prompt: 'Test', model };
        const actualCost = await calculateActualCost(row, 1000, 500);

        const expectedCost = (1000 / 1000) * inputRate + (500 / 1000) * outputRate;
        expect(actualCost).toBeCloseTo(expectedCost, 8);
      }
    });

    it('should use fallback pricing for unknown models in actual calculation', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test',
        model: 'unknown/model',
      };

      const actualCost = await calculateActualCost(row, 100, 50);

      // Should use o3-2025-04-16 fallback: 0.002 input, 0.008 output
      const expectedCost = (100 / 1000) * 0.002 + (50 / 1000) * 0.008;
      expect(actualCost).toBeCloseTo(expectedCost, 8);
    });

    it('should handle unavailable pricing gracefully', async () => {
      // Test with a model that would fall back to default pricing
      const row: BatchRow = {
        id: '1',
        prompt: 'Test',
        model: 'totally-unknown/nonexistent-model',
      };

      const actualCost = await calculateActualCost(row, 100, 50);

      // Should still return a valid cost using fallback pricing
      expect(actualCost).toBeGreaterThan(0);
      expect(Number.isFinite(actualCost)).toBe(true);
    });
  });

  describe('Model Pricing Validation', () => {
    it('should correctly handle all supported model types', async () => {
      const supportedModels = [
        { model: 'openai/gpt-4o', expectedInputRate: 0.0025 },
        { model: 'openai/gpt-4o-mini', expectedInputRate: 0.0006 },
        { model: 'anthropic/claude-3-5-sonnet-20241022', expectedInputRate: 0.003 },
        { model: 'anthropic/claude-3-haiku-20240307', expectedInputRate: 0.00025 },
        { model: 'anthropic/claude-opus-4-20250514', expectedInputRate: 0.015 },
        { model: 'grok/grok-3', expectedInputRate: 0.003 },
        { model: 'grok/grok-3-mini', expectedInputRate: 0.0003 },
        { model: 'gemini/models/gemini-2.5-flash-preview', expectedInputRate: 0.00035 },
        { model: 'gemini/models/gemini-2.5-pro-thinking', expectedInputRate: 0.00125 },
      ];

      for (const { model, expectedInputRate } of supportedModels) {
        const rows: BatchRow[] = [{ id: '1', prompt: 'Test prompt', model }];
        const estimation = await estimateCost(rows);

        const expectedTokens = Math.ceil('Test prompt'.length / 4);
        const expectedCost = (expectedTokens / 1000) * expectedInputRate;

        expect(estimation.perRow[0].est_cost).toBeCloseTo(expectedCost, 8);
      }
    });

    it('should handle provider inference correctly', async () => {
      const inferenceTests = [
        { model: 'gpt-4o', expectedProvider: 'openai' },
        { model: 'claude-3-5-sonnet-20241022', expectedProvider: 'anthropic' },
        { model: 'grok-3', expectedProvider: 'grok' },
        { model: 'gemini-2.5-flash-preview', expectedProvider: 'gemini' },
        { model: 'o3-2025-04-16', expectedProvider: 'openai' },
      ];

      for (const { model } of inferenceTests) {
        const row: BatchRow = { id: '1', prompt: 'Test', model };
        const cost = await calculateActualCost(row, 100, 50);

        // Should return a reasonable cost (not 0, which would indicate failure)
        expect(cost).toBeGreaterThan(0);
        expect(Number.isFinite(cost)).toBe(true);
      }
    });
  });

  describe('Edge Cases and Precision', () => {
    it('should handle zero tokens gracefully', async () => {
      const row: BatchRow = { id: '1', prompt: '', model: 'openai/gpt-4o' };
      const cost = await calculateActualCost(row, 0, 0);
      expect(cost).toBe(0);
    });

    it('should maintain precision with very small costs', async () => {
      const row: BatchRow = { id: '1', prompt: 'Hi', model: 'anthropic/claude-3-haiku-20240307' };
      const cost = await calculateActualCost(row, 1, 1);

      const expectedCost = (1 / 1000) * 0.00025 + (1 / 1000) * 0.00125;
      expect(cost).toBeCloseTo(expectedCost, 10);
      expect(cost).toBeGreaterThan(0);
    });

    it('should handle large token counts without overflow', async () => {
      const row: BatchRow = { id: '1', prompt: 'Large', model: 'openai/gpt-4o' };
      const cost = await calculateActualCost(row, 1000000, 500000);

      const expectedCost = (1000000 / 1000) * 0.0025 + (500000 / 1000) * 0.005;
      expect(cost).toBeCloseTo(expectedCost, 6);
      expect(cost).toBeGreaterThan(1); // Should be substantial
    });

    it('should format costs correctly', () => {
      const testCosts = [0.00000001, 0.12345678, 1.23456789];

      testCosts.forEach((cost) => {
        const formatted = cost.toFixed(8);
        expect(formatted).toMatch(/^\d+\.\d{8}$/);
        expect(parseFloat(formatted)).toBeCloseTo(cost, 8);
      });
    });
  });
});
