import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estimateCost, calculateActualCost } from '../../apps/ui/src/lib/batch/estimateCost';
import type { BatchRow } from '../../apps/ui/src/types/batch';
import modelPricingData from '../../data/model-pricing.json';

// Mock the new pricing utility
vi.mock('../../shared/utils/loadPricing', () => ({
  loadPricing: vi.fn(),
  getModel: vi.fn((id: string) => {
    const model = modelPricingData.find((m) => `${m.provider}/${m.id}` === id);
    if (model) return model;
    // Handle cases where provider is not included
    const modelWithoutProvider = modelPricingData.find((m) => m.id === id);
    if (modelWithoutProvider) return modelWithoutProvider;
    throw new Error(`Unknown model id: ${id}`);
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
          model: 'anthropic/claude-3-7-sonnet-20250219',
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

      // Test GPT-4o (should use $5.0/M rate)
      const row1 = estimation.perRow.find((r) => r.id === '1');
      expect(row1).toBeDefined();
      const expectedTokens1 = Math.ceil(rows[0].prompt.length / 4);
      const expectedCost1 = (expectedTokens1 / 1000000) * 5.0;
      expect(row1!.est_cost).toBeCloseTo(expectedCost1, 8);

      // Test Claude Sonnet (should use $3.0/M rate)
      const row2 = estimation.perRow.find((r) => r.id === '2');
      expect(row2).toBeDefined();
      const expectedTokens2 = Math.ceil(rows[1].prompt.length / 4);
      const expectedCost2 = (expectedTokens2 / 1000000) * 3.0;
      expect(row2!.est_cost).toBeCloseTo(expectedCost2, 8);

      // Test Gemini (should use $0.15/M rate)
      const row3 = estimation.perRow.find((r) => r.id === '3');
      expect(row3).toBeDefined();
      const expectedTokens3 = Math.ceil(rows[2].prompt.length / 4);
      const expectedCost3 = (expectedTokens3 / 1000000) * 0.15;
      expect(row3!.est_cost).toBeCloseTo(expectedCost3, 8);
    });

    it('should throw an error for unknown models', async () => {
      const rows: BatchRow[] = [
        {
          id: '1',
          prompt: 'Test with unknown model',
          model: 'unknown/random-model',
        },
      ];

      await expect(estimateCost(rows)).rejects.toThrow('Unknown model id: unknown/random-model');
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
      const expectedCost = (expectedTokens / 1000000) * 5.0;
      expect(row.est_cost).toBeCloseTo(expectedCost, 8);
    });

    it('should accumulate total costs correctly', async () => {
      const rows: BatchRow[] = [
        { id: '1', prompt: 'p1', model: 'openai/gpt-4o' },
        { id: '2', prompt: 'p2', model: 'anthropic/claude-4-opus' },
      ];
      const estimation = await estimateCost(rows);
      const expectedTotal = 5 / 1000000 + 15 / 1000000;
      expect(estimation.totalUSD).toBeCloseTo(expectedTotal, 8);
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

      // GPT-4o: $5.0/M input + $20.0/M output
      const expectedCost = (100 / 1000000) * 5.0 + (50 / 1000000) * 20.0;
      expect(actualCost).toBeCloseTo(expectedCost, 8);
    });

    it('should handle different model rates in actual calculation', async () => {
      const testCases = [
        {
          model: 'openai/gpt-4o',
          inputRate: 5.0,
          outputRate: 20.0,
        },
        {
          model: 'anthropic/claude-3-7-sonnet-20250219',
          inputRate: 3.0,
          outputRate: 15.0,
        },
        {
          model: 'grok/grok-3',
          inputRate: 3.0,
          outputRate: 15.0,
        },
      ];

      for (const { model, inputRate, outputRate } of testCases) {
        const row: BatchRow = { id: '1', prompt: 'Test', model };
        const actualCost = await calculateActualCost(row, 1000, 500);

        const expectedCost = (1000 / 1000000) * inputRate + (500 / 1000000) * outputRate;
        expect(actualCost).toBeCloseTo(expectedCost, 8);
      }
    });

    it('should throw an error for unknown models in actual calculation', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test',
        model: 'unknown/model',
      };

      await expect(calculateActualCost(row, 100, 50)).rejects.toThrow(
        'Unknown model id: unknown/model'
      );
    });

    it('should throw an error for unavailable pricing', async () => {
      // Test with a model that would fall back to default pricing
      const row: BatchRow = {
        id: '1',
        prompt: 'Test',
        model: 'totally-unknown/nonexistent-model',
      };

      await expect(calculateActualCost(row, 100, 50)).rejects.toThrow(
        'Unknown model id: totally-unknown/nonexistent-model'
      );
    });
  });

  describe('Model Pricing Validation', () => {
    it('should correctly handle all supported model types', async () => {
      const supportedModels = modelPricingData.map((m) => ({
        model: `${m.provider}/${m.id}`,
        expectedInputRate: m.pricing.prompt,
      }));

      for (const { model, expectedInputRate } of supportedModels) {
        const rows: BatchRow[] = [{ id: '1', prompt: 'Test prompt', model }];
        const estimation = await estimateCost(rows);

        const expectedTokens = Math.ceil('Test prompt'.length / 4);
        const expectedCost = (expectedTokens / 1000000) * expectedInputRate;

        expect(estimation.perRow[0].est_cost).toBeCloseTo(expectedCost, 8);
      }
    });

    it('should handle provider inference correctly', async () => {
      const inferenceTests = [
        { model: 'gpt-4o' },
        { model: 'claude-3-7-sonnet-20250219' },
        { model: 'grok-3' },
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
      const row: BatchRow = { id: '1', prompt: 'Hi', model: 'openai/gpt-4.1-nano' };
      const cost = await calculateActualCost(row, 1, 1);

      const expectedCost = (1 / 1000000) * 0.1 + (1 / 1000000) * 0.4;
      expect(cost).toBeCloseTo(expectedCost, 10);
      expect(cost).toBeGreaterThan(0);
    });

    it('should handle large token counts without overflow', async () => {
      const row: BatchRow = { id: '1', prompt: 'Large', model: 'openai/gpt-4o' };
      const cost = await calculateActualCost(row, 1000000, 500000);

      const expectedCost = (1000000 / 1000000) * 5.0 + (500000 / 1000000) * 20.0;
      expect(cost).toBeCloseTo(expectedCost, 6);
      expect(cost).toBeGreaterThan(1);
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
