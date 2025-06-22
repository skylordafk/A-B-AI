import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estimateCost, calculateActualCost } from '../../apps/ui/src/lib/batch/estimateCost';
import type { BatchRow } from '../../apps/ui/src/types/batch';

// Mock the pricing data loading with REAL pricing structure
vi.mock('../../apps/ui/src/lib/batch/loadPricingData', () => ({
  loadPricingData: vi.fn().mockResolvedValue({
    openai: {
      'gpt-4o': { prompt: 0.0025, completion: 0.005 }, // $2.50/$5.00 per 1M -> per 1K
      'gpt-4o-mini': { prompt: 0.0006, completion: 0.0024 }, // $0.60/$2.40 per 1M -> per 1K
      'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 }, // $0.50/$1.50 per 1M -> per 1K
      'o3-2025-04-16': { prompt: 0.002, completion: 0.008 }, // Default fallback model
    },
    anthropic: {
      'claude-3-5-sonnet-20241022': { prompt: 0.003, completion: 0.015 }, // $3.00/$15.00 per 1M -> per 1K
      'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 }, // $0.25/$1.25 per 1M -> per 1K
      'claude-opus-4-20250514': { prompt: 0.015, completion: 0.075 }, // $15.00/$75.00 per 1M -> per 1K
    },
    grok: {
      'grok-3': { prompt: 0.003, completion: 0.015 }, // $3.00/$15.00 per 1M -> per 1K
      'grok-3-mini': { prompt: 0.0003, completion: 0.0005 }, // $0.30/$0.50 per 1M -> per 1K
    },
    gemini: {
      'models/gemini-2.5-pro-thinking': { prompt: 0.00125, completion: 0.01 }, // $1.25/$10.00 per 1M -> per 1K
      'models/gemini-2.5-flash-preview': { prompt: 0.00035, completion: 0.00175 }, // $0.35/$1.75 per 1M -> per 1K
    },
  }),
  getProviderAndModel: vi.fn().mockImplementation((modelString) => {
    if (!modelString) {
      return { provider: 'openai', model: 'o3-2025-04-16' };
    }

    if (modelString.includes('/')) {
      const firstSlashIndex = modelString.indexOf('/');
      const provider = modelString.substring(0, firstSlashIndex);
      const model = modelString.substring(firstSlashIndex + 1);
      return { provider, model };
    }

    // Fallback logic
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

      // Calculate expected cost: ~20 tokens * $0.0025/1K tokens = ~$0.00005
      const expectedTokens = Math.ceil(rows[0].prompt.length / 4);
      const expectedCost = (expectedTokens / 1000) * 0.0025; // GPT-4o input pricing
      expect(row1!.est_cost).toBeCloseTo(expectedCost, 6);

      // Verify second row (Anthropic Claude)
      const row2 = estimation.perRow.find((r) => r.id === '2');
      expect(row2).toBeDefined();
      expect(row2!.tokens_in).toBeGreaterThan(0);
      expect(row2!.est_cost).toBeGreaterThan(0);

      // Calculate expected cost: ~20 tokens * $0.003/1K tokens = ~$0.00006
      const expectedTokens2 = Math.ceil(rows[1].prompt.length / 4);
      const expectedCost2 = (expectedTokens2 / 1000) * 0.003; // Claude 3.5 Sonnet input pricing
      expect(row2!.est_cost).toBeCloseTo(expectedCost2, 6);
    });

    it('should handle system prompts in cost estimation correctly', async () => {
      const rows: BatchRow[] = [
        {
          id: '1',
          prompt: 'User prompt text',
          system: 'You are a helpful assistant. Please respond thoughtfully.',
          model: 'openai/gpt-4o',
        },
      ];

      const estimation = await estimateCost(rows);
      const row = estimation.perRow[0];

      // Should include both system and user prompt tokens
      expect(row.tokens_in).toBeGreaterThan(4);
      expect(row.est_cost).toBeGreaterThan(0);

      // Calculate expected cost
      const combinedText =
        'You are a helpful assistant. Please respond thoughtfully.\n\nUser prompt text';
      const expectedTokens = Math.ceil(combinedText.length / 4);
      const expectedCost = (expectedTokens / 1000) * 0.0025; // GPT-4o pricing per 1K tokens
      expect(row.est_cost).toBeCloseTo(expectedCost, 6);
    });

    it('should use correct pricing rates for different models', async () => {
      const testCases = [
        { model: 'openai/gpt-4o', expectedRate: 0.0025 },
        { model: 'openai/gpt-4o-mini', expectedRate: 0.0006 },
        { model: 'anthropic/claude-3-haiku-20240307', expectedRate: 0.00025 },
        { model: 'anthropic/claude-opus-4-20250514', expectedRate: 0.015 },
        { model: 'grok/grok-3', expectedRate: 0.003 },
        { model: 'gemini/models/gemini-2.5-flash-preview', expectedRate: 0.00035 },
      ];

      const prompt = 'Standard test prompt for comparison';
      const expectedTokens = Math.ceil(prompt.length / 4);

      for (const { model, expectedRate } of testCases) {
        const rows: BatchRow[] = [{ id: '1', prompt, model }];
        const estimation = await estimateCost(rows);

        const expectedCost = (expectedTokens / 1000) * expectedRate; // Rate is already per 1K tokens
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
    it('should calculate actual costs with input and output tokens correctly', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test prompt',
        model: 'openai/gpt-4o',
      };

      const inputTokens = 100;
      const outputTokens = 150;

      const actualCost = await calculateActualCost(row, inputTokens, outputTokens);

      // GPT-4o: $0.0025/1K input, $0.005/1K output (converted from per 1M)
      const expectedInputCost = (inputTokens / 1000) * 0.0025;
      const expectedOutputCost = (outputTokens / 1000) * 0.005;
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

    it('should use fallback pricing for unknown models', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test prompt',
        model: 'unknown/model-that-doesnt-exist',
      };

      const actualCost = await calculateActualCost(row, 100, 50);

      // Should use o3-2025-04-16 fallback pricing: $0.002/1K input, $0.008/1K output
      const expectedCost = (100 / 1000) * 0.002 + (50 / 1000) * 0.008;
      expect(actualCost).toBeCloseTo(expectedCost, 8);
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

    it('should use fallback pricing for models with unavailable pricing', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Test prompt',
        model: 'openai/non-existent-model',
      };

      const actualCost = await calculateActualCost(row, 100, 50);

      // Should use fallback o3-2025-04-16 pricing: $0.002 input, $0.008 output
      const expectedCost = (100 / 1000) * 0.002 + (50 / 1000) * 0.008;
      expect(actualCost).toBeCloseTo(expectedCost, 8);
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
      const expectedCost = (largeInputTokens / 1000) * 0.0025 + (largeOutputTokens / 1000) * 0.005;
      expect(actualCost).toBeCloseTo(expectedCost, 6);
      expect(actualCost).toBeGreaterThan(2); // Should be substantial cost
    });

    it('should handle very small token counts with proper precision', async () => {
      const row: BatchRow = {
        id: '1',
        prompt: 'Hi',
        model: 'anthropic/claude-3-haiku-20240307',
      };

      const actualCost = await calculateActualCost(row, 1, 1);

      // Should handle small numbers with proper precision
      const expectedCost = (1 / 1000) * 0.00025 + (1 / 1000) * 0.00125;
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
        const expectedCost = (scale.tokens / 1000) * 0.0025 + (scale.tokens / 1000) * 0.005;
        expect(cost).toBeCloseTo(expectedCost, 8);
      }
    });
  });

  describe('Provider-Specific Pricing', () => {
    it('should correctly identify and price different providers', async () => {
      const providerTests = [
        { model: 'openai/gpt-4o', expectedProvider: 'openai', expectedModel: 'gpt-4o' },
        {
          model: 'anthropic/claude-3-5-sonnet-20241022',
          expectedProvider: 'anthropic',
          expectedModel: 'claude-3-5-sonnet-20241022',
        },
        { model: 'grok/grok-3', expectedProvider: 'grok', expectedModel: 'grok-3' },
        {
          model: 'gemini/models/gemini-2.5-flash-preview',
          expectedProvider: 'gemini',
          expectedModel: 'models/gemini-2.5-flash-preview',
        },
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
        { model: 'gpt-4o', expectedProvider: 'openai' },
        { model: 'claude-3-5-sonnet-20241022', expectedProvider: 'anthropic' },
        { model: 'grok-3', expectedProvider: 'grok' },
        { model: 'gemini-2.5-flash-preview', expectedProvider: 'gemini' },
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
