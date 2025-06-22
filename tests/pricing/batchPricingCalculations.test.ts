import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estimateCost, calculateActualCost } from '../../apps/ui/src/lib/batch/estimateCost';
// import { runRow } from '../../apps/ui/src/lib/batch/runRow';
import type { BatchRow } from '../../apps/ui/src/types/batch';

// Mock the pricing data loading with CORRECT per-1K-token pricing
vi.mock('../../apps/ui/src/lib/batch/loadPricingData', () => ({
  loadPricingData: vi.fn().mockResolvedValue({
    openai: {
      'gpt-4o': { prompt: 0.0025, completion: 0.005 },
      'gpt-4o-mini': { prompt: 0.0006, completion: 0.0024 },
      'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
      'o3-2025-04-16': { prompt: 0.002, completion: 0.008 }, // Fallback model
    },
    anthropic: {
      'claude-3-5-sonnet-20241022': { prompt: 0.003, completion: 0.015 },
      'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },
      'claude-opus-4-20250514': { prompt: 0.015, completion: 0.075 },
    },
    grok: {
      'grok-3': { prompt: 0.003, completion: 0.015 },
      'grok-3-mini': { prompt: 0.0003, completion: 0.0005 },
    },
    gemini: {
      'models/gemini-2.5-pro-thinking': { prompt: 0.00125, completion: 0.01 },
      'models/gemini-2.5-flash-preview': { prompt: 0.00035, completion: 0.00175 },
    },
  }),
  getProviderAndModel: vi.fn().mockImplementation((modelString) => {
    if (!modelString) {
      return { provider: 'openai', model: 'o3-2025-04-16' };
    }

    // Handle provider/model format correctly
    if (modelString.includes('/')) {
      const firstSlashIndex = modelString.indexOf('/');
      const provider = modelString.substring(0, firstSlashIndex);
      const model = modelString.substring(firstSlashIndex + 1);
      return { provider, model };
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
          prompt: 'Another test prompt that is slightly different but similar length.',
          model: 'anthropic/claude-3-5-sonnet-20241022',
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

      // Calculate expected cost with correct pricing: ~20 tokens * $0.0025/1K tokens
      const expectedTokens1 = Math.ceil(rows[0].prompt.length / 4);
      const expectedCost1 = (expectedTokens1 / 1000) * 0.0025;
      expect(row1!.est_cost).toBeCloseTo(expectedCost1, 8);

      // Verify second row (Anthropic Claude)
      const row2 = estimation.perRow.find((r) => r.id === '2');
      expect(row2).toBeDefined();
      expect(row2!.tokens_in).toBeGreaterThan(0);
      expect(row2!.est_cost).toBeGreaterThan(0);

      // Calculate expected cost with correct pricing: ~20 tokens * $0.003/1K tokens
      const expectedTokens2 = Math.ceil(rows[1].prompt.length / 4);
      const expectedCost2 = (expectedTokens2 / 1000) * 0.003;
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
      const expectedCost = (expectedTokens / 1000) * 0.0025; // GPT-4o pricing: $0.0025 per 1K tokens
      expect(row.est_cost).toBeCloseTo(expectedCost, 8);
    });

    it('should handle different model pricing correctly', async () => {
      const models = [
        { model: 'openai/gpt-4o', expectedRate: 0.0025 },
        { model: 'openai/gpt-4o-mini', expectedRate: 0.0006 },
        { model: 'anthropic/claude-3-haiku-20240307', expectedRate: 0.00025 },
        { model: 'anthropic/claude-opus-4-20250514', expectedRate: 0.015 },
        { model: 'grok/grok-3', expectedRate: 0.003 },
        { model: 'gemini/models/gemini-2.5-flash-preview', expectedRate: 0.00035 },
      ];

      const prompt = 'Standard test prompt for comparison';
      const expectedTokens = Math.ceil(prompt.length / 4);

      for (const { model, expectedRate } of models) {
        const rows: BatchRow[] = [{ id: '1', prompt, model }];
        const estimation = await estimateCost(rows);

        const expectedCost = (expectedTokens / 1000) * expectedRate;
        expect(estimation.perRow[0].est_cost).toBeCloseTo(expectedCost, 8);
      }
    });

    it('should accumulate total cost correctly', async () => {
      const rows: BatchRow[] = [
        { id: '1', prompt: 'First prompt', model: 'openai/gpt-4o' },
        { id: '2', prompt: 'Second prompt', model: 'openai/gpt-4o' },
        { id: '3', prompt: 'Third prompt', model: 'anthropic/claude-3-5-sonnet-20241022' },
      ];

      const estimation = await estimateCost(rows);

      const sumOfIndividualCosts = estimation.perRow.reduce((sum, row) => sum + row.est_cost, 0);
      expect(estimation.totalUSD).toBeCloseTo(sumOfIndividualCosts, 8);
      expect(estimation.totalUSD).toBeGreaterThan(0);
    });
  });

  describe('Actual Cost Calculation (Post-Processing)', () => {
    it('should calculate actual costs with input and output tokens', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test prompt',
        model: 'openai/gpt-4o',
      };

      const inputTokens = 100;
      const outputTokens = 150;

      const actualCost = await calculateActualCost(row, inputTokens, outputTokens);

      // GPT-4o: $0.0025/1K input, $0.005/1K output
      const expectedInputCost = (inputTokens / 1000) * 0.0025;
      const expectedOutputCost = (outputTokens / 1000) * 0.005;
      const expectedTotal = expectedInputCost + expectedOutputCost;

      expect(actualCost).toBeCloseTo(expectedTotal, 8);
      expect(actualCost).toBeGreaterThan(0);
    });

    it('should handle different completion costs correctly', async () => {
      const testCases = [
        {
          model: 'openai/gpt-4o',
          inputTokens: 1000,
          outputTokens: 500,
          expectedInputRate: 0.0025,
          expectedOutputRate: 0.005,
        },
        {
          model: 'anthropic/claude-3-5-sonnet-20241022',
          inputTokens: 1000,
          outputTokens: 500,
          expectedInputRate: 0.003,
          expectedOutputRate: 0.015,
        },
        {
          model: 'anthropic/claude-opus-4-20250514',
          inputTokens: 1000,
          outputTokens: 500,
          expectedInputRate: 0.015,
          expectedOutputRate: 0.075,
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

        const expectedInputCost = (inputTokens / 1000) * expectedInputRate;
        const expectedOutputCost = (outputTokens / 1000) * expectedOutputRate;
        const expectedTotal = expectedInputCost + expectedOutputCost;

        expect(actualCost).toBeCloseTo(expectedTotal, 8);
      }
    });

    it('should handle zero output tokens (input-only cost)', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test prompt',
        model: 'openai/gpt-4o',
      };

      const actualCost = await calculateActualCost(row, 100, 0);

      // Should only include input cost
      const expectedCost = (100 / 1000) * 0.0025;
      expect(actualCost).toBeCloseTo(expectedCost, 8);
    });

    it('should use fallback pricing for unknown models', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test prompt',
        model: 'unknown/model',
      };

      const actualCost = await calculateActualCost(row, 100, 50);

      // Should use fallback o3-2025-04-16 pricing: $0.002 input, $0.008 output
      const expectedCost = (100 / 1000) * 0.002 + (50 / 1000) * 0.008;
      expect(actualCost).toBeCloseTo(expectedCost, 8);
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
      const expectedCost = (largeInputTokens / 1000) * 0.0025 + (largeOutputTokens / 1000) * 0.005;
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
      const expectedCost = (1 / 1000) * 0.0025 + (1 / 1000) * 0.005;
      expect(actualCost).toBeCloseTo(expectedCost, 8);
      expect(actualCost).toBeGreaterThan(0);
    });

    it('should maintain precision with fractional costs', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test',
        model: 'anthropic/claude-3-haiku-20240307', // Low cost model
      };

      const actualCost = await calculateActualCost(row, 1, 1);

      // Claude 3 Haiku: $0.00025/1K input, $0.00125/1K output
      const expectedCost = (1 / 1000) * 0.00025 + (1 / 1000) * 0.00125;
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
        { id: '2', prompt: 'Test prompt 2', model: 'anthropic/claude-3-5-sonnet-20241022' },
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
        { id: '2', prompt: 'Anthropic test', model: 'anthropic/claude-3-5-sonnet-20241022' },
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
  });
});
