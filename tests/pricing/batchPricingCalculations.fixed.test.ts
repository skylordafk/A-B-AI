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

describe('Batch Pricing Calculations (Fixed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock token counting: ~1 token per 4 characters
    mockApi.countTokens.mockImplementation((text: string) =>
      Promise.resolve(Math.ceil(text.length / 4))
    );
  });

  describe('Cost Estimation (Dry-Run)', () => {
    it('should estimate input-only costs for dry-run modal with correct pricing', async () => {
      const rows: BatchRow[] = [
        {
          id: '1',
          prompt:
            'This is a test prompt with about twenty words to get a reasonable token count for testing.',
          model: 'openai/gpt-4o',
        },
        {
          id: '2',
          prompt:
            'Another test prompt that is slightly different but similar length for comparison testing.',
          model: 'anthropic/claude-3-7-sonnet-20250219',
        },
      ];

      const estimation = await estimateCost(rows);

      expect(estimation).toBeDefined();
      expect(estimation.totalUSD).toBeGreaterThan(0);
      expect(estimation.perRow).toHaveLength(2);

      // Verify first row (OpenAI GPT-4o)
      const row1 = estimation.perRow.find((r) => r.id === '1');
      expect(row1).toBeDefined();
      expect(row1!.tokens_in).toBeGreaterThan(0);
      expect(row1!.est_cost).toBeGreaterThan(0);

      // Calculate expected cost: tokens * ($5.0 / 1M)
      const expectedTokens = Math.ceil(rows[0].prompt.length / 4);
      const expectedCost = (expectedTokens / 1000000) * 5.0; // GPT-4o input pricing
      expect(row1!.est_cost).toBeCloseTo(expectedCost, 8);

      // Verify second row (Anthropic Claude)
      const row2 = estimation.perRow.find((r) => r.id === '2');
      expect(row2).toBeDefined();
      expect(row2!.tokens_in).toBeGreaterThan(0);
      expect(row2!.est_cost).toBeGreaterThan(0);

      // Calculate expected cost: tokens * ($3.0 / 1M)
      const expectedTokens2 = Math.ceil(rows[1].prompt.length / 4);
      const expectedCost2 = (expectedTokens2 / 1000000) * 3.0; // Claude 3.7 Sonnet input pricing
      expect(row2!.est_cost).toBeCloseTo(expectedCost2, 8);
    });

    it('should handle system prompts in cost estimation correctly', async () => {
      const rows: BatchRow[] = [
        { id: '1', prompt: 'Test prompt', model: 'openai/gpt-4o', system: 'You are a bot.' },
      ];
      const estimation = await estimateCost(rows);
      // "You are a bot.\n\nTest prompt" is 28 chars -> ~7 tokens
      // Cost = (7 / 1,000,000) * 5.0 = 0.000035
      expect(estimation.totalUSD).toBeCloseTo(0.000035, 8);
    });

    it('should use correct pricing rates for different models', async () => {
      const testCases = [
        { model: 'openai/gpt-4o', expectedRate: 5.0 },
        { model: 'openai/gpt-4o-mini', expectedRate: 0.6 },
        { model: 'anthropic/claude-3-5-haiku-20241022', expectedRate: 0.8 },
        { model: 'anthropic/claude-4-opus', expectedRate: 15.0 },
        { model: 'grok/grok-3', expectedRate: 3.0 },
        { model: 'gemini/models/gemini-2.5-flash-preview', expectedRate: 0.15 },
      ];

      const prompt = 'Standard test prompt for comparison';
      const expectedTokens = Math.ceil(prompt.length / 4);

      for (const { model, expectedRate } of testCases) {
        const rows: BatchRow[] = [{ id: '1', prompt, model }];
        const estimation = await estimateCost(rows);

        const expectedCost = (expectedTokens / 1000000) * expectedRate; // Rate is per 1M tokens
        expect(estimation.perRow[0].est_cost).toBeCloseTo(expectedCost, 8);
      }
    });

    it('should accumulate total cost correctly', async () => {
      const rows: BatchRow[] = [
        { id: '1', prompt: 'First prompt', model: 'openai/gpt-4o' },
        { id: '2', prompt: 'Second prompt', model: 'openai/gpt-4o' },
        { id: '3', prompt: 'Third prompt', model: 'anthropic/claude-3-7-sonnet-20250219' },
      ];

      const estimation = await estimateCost(rows);

      const sumOfIndividualCosts = estimation.perRow.reduce((sum, row) => sum + row.est_cost, 0);
      expect(estimation.totalUSD).toBeCloseTo(sumOfIndividualCosts, 8);
      expect(estimation.totalUSD).toBeGreaterThan(0);
    });
  });

  describe('Actual Cost Calculation (Post-Processing)', () => {
    it('should calculate actual costs with input and output tokens correctly', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test prompt',
        model: 'openai/gpt-4o',
      };

      const inputTokens = 100;
      const outputTokens = 150;

      const actualCost = await calculateActualCost(row, inputTokens, outputTokens);

      // GPT-4o: $5.0/M input, $20.0/M output
      const expectedInputCost = (inputTokens / 1000000) * 5.0;
      const expectedOutputCost = (outputTokens / 1000000) * 20.0;
      const expectedTotal = expectedInputCost + expectedOutputCost;

      expect(actualCost).toBeCloseTo(expectedTotal, 8);
      expect(actualCost).toBeGreaterThan(0);
    });

    it('should handle different model pricing correctly in actual calculation', async () => {
      const testCases = [
        {
          model: 'openai/gpt-4o',
          inputTokens: 1000,
          outputTokens: 500,
          expectedInputRate: 5.0,
          expectedOutputRate: 20.0,
        },
        {
          model: 'anthropic/claude-3-7-sonnet-20250219',
          inputTokens: 1000,
          outputTokens: 500,
          expectedInputRate: 3.0,
          expectedOutputRate: 15.0,
        },
        {
          model: 'anthropic/claude-4-opus',
          inputTokens: 1000,
          outputTokens: 500,
          expectedInputRate: 15.0,
          expectedOutputRate: 75.0,
        },
      ];

      for (const {
        model,
        inputTokens,
        outputTokens,
        expectedInputRate,
        expectedOutputRate,
      } of testCases) {
        const row: BatchRow = { id: '1', prompt: 'Test', model };
        const actualCost = await calculateActualCost(row, inputTokens, outputTokens);

        const expectedInputCost = (inputTokens / 1000000) * expectedInputRate;
        const expectedOutputCost = (outputTokens / 1000000) * expectedOutputRate;
        const expectedTotal = expectedInputCost + expectedOutputCost;

        expect(actualCost).toBeCloseTo(expectedTotal, 8);
      }
    });

    it('should throw an error for unknown models', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test prompt',
        model: 'unknown/model-that-doesnt-exist',
      };

      await expect(calculateActualCost(row, 100, 50)).rejects.toThrow(
        'Unknown model id: unknown/model-that-doesnt-exist'
      );
    });

    it('should handle zero output tokens (input-only cost)', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test prompt',
        model: 'openai/gpt-4o',
      };

      const actualCost = await calculateActualCost(row, 100, 0);

      // Should only include input cost
      const expectedCost = (100 / 1000000) * 5.0;
      expect(actualCost).toBeCloseTo(expectedCost, 8);
    });

    it('should throw an error for models with unavailable pricing', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test prompt',
        model: 'openai/non-existent-model',
      };

      await expect(calculateActualCost(row, 100, 50)).rejects.toThrow(
        'Unknown model id: openai/non-existent-model'
      );
    });
  });

  describe('Edge Cases and Precision', () => {
    it('should handle very large token counts without precision loss', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test prompt',
        model: 'openai/gpt-4o',
      };

      const largeInputTokens = 1000000; // 1M tokens
      const largeOutputTokens = 500000; // 500K tokens

      const actualCost = await calculateActualCost(row, largeInputTokens, largeOutputTokens);

      // Should handle large numbers correctly
      const expectedCost =
        (largeInputTokens / 1000000) * 5.0 + (largeOutputTokens / 1000000) * 20.0;
      expect(actualCost).toBeCloseTo(expectedCost, 6);
      expect(actualCost).toBeGreaterThan(2); // Should be substantial cost
    });

    it('should handle very small token counts with proper precision', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Hi',
        model: 'anthropic/claude-3-5-haiku-20241022',
      };

      const actualCost = await calculateActualCost(row, 1, 1);

      // Should handle small numbers with proper precision
      const expectedCost = (1 / 1000000) * 0.8 + (1 / 1000000) * 4.0;
      expect(actualCost).toBeCloseTo(expectedCost, 10);
      expect(actualCost).toBeGreaterThan(0);
    });

    it('should maintain cost calculation accuracy across different scales', async () => {
      const scales = [
        { tokens: 1, description: 'minimal' },
        { tokens: 100, description: 'small' },
        { tokens: 10000, description: 'medium' },
        { tokens: 100000, description: 'large' },
      ];

      for (const scale of scales) {
        const row: BatchRow = {
          id: `scale-${scale.description}`,
          prompt: 'Scale test',
          model: 'openai/gpt-4o',
        };

        const cost = await calculateActualCost(row, scale.tokens, scale.tokens);

        expect(cost).toBeGreaterThan(0);
        expect(Number.isFinite(cost)).toBe(true);

        // Calculate expected cost
        const expectedCost = (scale.tokens / 1000000) * 5.0 + (scale.tokens / 1000000) * 20.0;
        expect(cost).toBeCloseTo(expectedCost, 8);
      }
    });
  });

  describe('Provider-Specific Pricing', () => {
    it('should correctly identify and price different providers', async () => {
      const providerTests = [
        { model: 'openai/gpt-4o' },
        { model: 'anthropic/claude-3-7-sonnet-20250219' },
        { model: 'grok/grok-3' },
        { model: 'gemini/models/gemini-2.5-flash-preview' },
      ];

      for (const { model } of providerTests) {
        const row: BatchRow = { id: '1', prompt: 'Test', model };
        const cost = await calculateActualCost(row, 1000, 500);

        expect(cost).toBeGreaterThan(0);
        expect(Number.isFinite(cost)).toBe(true);
      }
    });

    it('should handle model strings without provider prefix', async () => {
      const modelOnlyTests = [
        { model: 'gpt-4o' },
        { model: 'claude-3-7-sonnet-20250219' },
        { model: 'grok-3' },
      ];

      for (const { model } of modelOnlyTests) {
        const row: BatchRow = { id: '1', prompt: 'Test', model };
        const cost = await calculateActualCost(row, 100, 50);

        // Should not throw and should return a reasonable cost
        expect(cost).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(cost)).toBe(true);
      }
    });
  });
});
