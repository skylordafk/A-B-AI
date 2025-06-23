import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estimateCost, calculateActualCost } from '../../apps/ui/src/lib/batch/estimateCost';
// import { runRow } from '../../apps/ui/src/lib/batch/runRow';
import type { BatchRow } from '../../apps/ui/src/types/batch';
import modelPricingData from '../../data/model-pricing.json';

// Mock the new pricing utility
vi.mock('../../shared/utils/loadPricing', () => ({
  loadPricing: vi.fn(),
  getModel: vi.fn((id: string) => {
    const model = modelPricingData.find((m) => `${m.provider}/${m.id}` === id);
    if (model) return model;
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

describe('Batch Pricing Calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default token estimation: ~1 token per 4 characters
    mockApi.countTokens.mockImplementation((text: string) =>
      Promise.resolve(Math.ceil(text.length / 4))
    );
  });

  describe('Cost Estimation (Dry-Run)', () => {
    it('should estimate input-only costs for dry-run modal', async () => {
      const rows: BatchRow[] = [
        {
          id: '1',
          prompt: 'This is a test prompt with about twenty words to get a reasonable token count.',
          model: 'openai/gpt-4o',
        },
        {
          id: '2',
          prompt: 'Another prompt that is slightly different but similar length.',
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
      const expectedTokens1 = Math.ceil(rows[0].prompt.length / 4);
      const expectedCost1 = (expectedTokens1 / 1000000) * 5.0;
      expect(row1!.est_cost).toBeCloseTo(expectedCost1, 8);

      // Verify second row (Anthropic Claude)
      const row2 = estimation.perRow.find((r) => r.id === '2');
      expect(row2).toBeDefined();
      expect(row2!.tokens_in).toBeGreaterThan(0);
      expect(row2!.est_cost).toBeGreaterThan(0);

      // Calculate expected cost: tokens * ($3.0 / 1M)
      const expectedTokens2 = Math.ceil(rows[1].prompt.length / 4);
      const expectedCost2 = (expectedTokens2 / 1000000) * 3.0;
      expect(row2!.est_cost).toBeCloseTo(expectedCost2, 8);
    });

    it('should handle system prompts in cost estimation', async () => {
      const rows: BatchRow[] = [
        {
          id: '1',
          prompt: 'User prompt text',
          system: 'You are a helpful assistant. Please respond thoughtfully and comprehensively.',
          model: 'openai/gpt-4o',
        },
      ];

      const estimation = await estimateCost(rows);
      const row = estimation.perRow[0];

      // Should include both system and user prompt tokens
      expect(row.tokens_in).toBeGreaterThan(4); // More than just user prompt
      expect(row.est_cost).toBeGreaterThan(0);

      // Cost should reflect combined token count with correct pricing
      const expectedTokens = Math.ceil(
        'You are a helpful assistant. Please respond thoughtfully and comprehensively.\n\nUser prompt text'
          .length / 4
      );
      const expectedCost = (expectedTokens / 1000000) * 5.0; // GPT-4o pricing: $5.0 per 1M tokens
      expect(row.est_cost).toBeCloseTo(expectedCost, 8);
    });

    it('should handle different model pricing correctly', async () => {
      const models = [
        { model: 'openai/gpt-4o', expectedRate: 5.0 },
        { model: 'openai/gpt-4o-mini', expectedRate: 0.6 },
        { model: 'anthropic/claude-3-5-haiku-20241022', expectedRate: 0.8 },
        { model: 'anthropic/claude-4-opus', expectedRate: 15.0 },
        { model: 'grok/grok-3', expectedRate: 3.0 },
        { model: 'gemini/models/gemini-2.5-flash-preview', expectedRate: 0.15 },
      ];

      const prompt = 'Standard test prompt for comparison';
      const expectedTokens = Math.ceil(prompt.length / 4);

      for (const { model, expectedRate } of models) {
        const rows: BatchRow[] = [{ id: '1', prompt, model }];
        const estimation = await estimateCost(rows);

        const expectedCost = (expectedTokens / 1000000) * expectedRate;
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
    it('should calculate actual costs with input and output tokens', async () => {
      const row: BatchRow = { id: '1', prompt: 'Test', model: 'gpt-4o' };
      const tokensIn = 1000;
      const tokensOut = 2000;

      const cost = await calculateActualCost(row, tokensIn, tokensOut);
      // gpt-4o: (1000/1M * 5) + (2000/1M * 20) = 0.005 + 0.04 = 0.045
      expect(cost).toBeCloseTo(0.045, 8);
    });

    it('should handle different completion costs correctly', async () => {
      const modelsToTest = [
        { id: 'openai/gpt-4o', expectedCost: 0.015 },
        { id: 'anthropic/claude-4-opus', expectedCost: 0.0525 },
      ];

      for (const { id, expectedCost } of modelsToTest) {
        const row: BatchRow = { id: '1', prompt: 'Test', model: id };
        const actualCost = await calculateActualCost(row, 1000, 500);
        // gpt-4o: (1000/1M * 5) + (500/1M * 20) = 0.005 + 0.01 = 0.015
        // claude-4-opus: (1000/1M * 15) + (500/1M * 75) = 0.015 + 0.0375 = 0.0525
        expect(actualCost).toBeCloseTo(expectedCost, 8);
      }
    });

    it('should handle zero output tokens (input-only cost)', async () => {
      const row: BatchRow = { id: '1', prompt: 'Test', model: 'openai/gpt-4o' };
      const cost = await calculateActualCost(row, 100, 0);
      // (100/1M * 5) = 0.0005
      expect(cost).toBeCloseTo(0.0005, 8);
    });

    it('should throw an error for unknown models', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test prompt',
        model: 'unknown/model',
      };

      await expect(calculateActualCost(row, 100, 50)).rejects.toThrow(
        'Unknown model id: unknown/model'
      );
    });
  });

  describe('Pricing Edge Cases', () => {
    it('should handle very large token counts', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test prompt',
        model: 'openai/gpt-4o',
      };

      const largeInputTokens = 1000000; // 1M tokens
      const largeOutputTokens = 500000; // 500K tokens

      const actualCost = await calculateActualCost(row, largeInputTokens, largeOutputTokens);

      // Should handle large numbers without precision loss
      const expectedCost =
        (largeInputTokens / 1000000) * 5.0 + (largeOutputTokens / 1000000) * 20.0;
      expect(actualCost).toBeCloseTo(expectedCost, 6);
      expect(actualCost).toBeGreaterThanOrEqual(5); // Should be substantial cost
    });

    it('should handle very small token counts', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Hi',
        model: 'openai/gpt-4o',
      };

      const actualCost = await calculateActualCost(row, 1, 1);

      // Should handle small numbers with proper precision
      const expectedCost = (1 / 1000000) * 5.0 + (1 / 1000000) * 20.0;
      expect(actualCost).toBeCloseTo(expectedCost, 8);
      expect(actualCost).toBeGreaterThan(0);
    });

    it('should maintain precision with fractional costs', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test',
        model: 'openai/gpt-4.1-nano', // Low cost model
      };

      const actualCost = await calculateActualCost(row, 1, 1);

      // gpt-4.1-nano: $0.1/M input, $0.4/M output
      const expectedCost = (1 / 1000000) * 0.1 + (1 / 1000000) * 0.4;
      expect(actualCost).toBeCloseTo(expectedCost, 10);
      expect(actualCost).toBeGreaterThan(0);

      // Should maintain precision in string representation
      expect(actualCost.toFixed(10)).toMatch(/^\d+\.\d{10}$/);
    });
  });

  describe('Cost Estimation Integration', () => {
    it('should provide consistent estimation format for dry-run modal', async () => {
      const rows: BatchRow[] = [
        { id: '1', prompt: 'Test prompt 1', model: 'openai/gpt-4o' },
        { id: '2', prompt: 'Test prompt 2', model: 'anthropic/claude-3-7-sonnet-20250219' },
      ];

      const estimation = await estimateCost(rows);

      // Verify structure matches CostEstimation interface
      expect(estimation).toHaveProperty('totalUSD');
      expect(estimation).toHaveProperty('perRow');
      expect(typeof estimation.totalUSD).toBe('number');
      expect(Array.isArray(estimation.perRow)).toBe(true);

      estimation.perRow.forEach((row) => {
        expect(row).toHaveProperty('id');
        expect(row).toHaveProperty('tokens_in');
        expect(row).toHaveProperty('est_cost');
        expect(typeof row.tokens_in).toBe('number');
        expect(typeof row.est_cost).toBe('number');
        expect(row.tokens_in).toBeGreaterThan(0);
        expect(row.est_cost).toBeGreaterThan(0);
      });
    });

    it('should handle mixed model types in single batch', async () => {
      const rows: BatchRow[] = [
        { id: '1', prompt: 'OpenAI test', model: 'openai/gpt-4o' },
        { id: '2', prompt: 'Anthropic test', model: 'anthropic/claude-3-7-sonnet-20250219' },
        { id: '3', prompt: 'Grok test', model: 'grok/grok-3' },
        { id: '4', prompt: 'Gemini test', model: 'gemini/models/gemini-2.5-flash-preview' },
      ];

      const estimation = await estimateCost(rows);

      expect(estimation.perRow).toHaveLength(4);
      expect(estimation.totalUSD).toBeGreaterThan(0);

      // Each row should have different costs based on model pricing
      const costs = estimation.perRow.map((r) => r.est_cost);

      // At least some costs should be different (different models have different rates)
      const uniqueCosts = new Set(costs);
      expect(uniqueCosts.size).toBeGreaterThan(1);
    });

    it('should accumulate total cost correctly', async () => {
      const rows: BatchRow[] = [
        { id: '1', prompt: 'Prompt 1', model: 'openai/gpt-4o' },
        { id: '2', prompt: 'Prompt 2', model: 'anthropic/claude-3-7-sonnet-20250219' },
      ];
      const estimation = await estimateCost(rows);

      const p1Tokens = Math.ceil('Prompt 1'.length / 4);
      const p2Tokens = Math.ceil('Prompt 2'.length / 4);

      // gpt-4o: $5.0 / 1M tokens
      const cost1 = (p1Tokens / 1000000) * 5.0;
      // claude-3-7-sonnet: $3.0 / 1M tokens
      const cost2 = (p2Tokens / 1000000) * 3.0;

      const expectedTotal = cost1 + cost2;
      expect(estimation.totalUSD).toBeCloseTo(expectedTotal, 8);
    });
  });
});
