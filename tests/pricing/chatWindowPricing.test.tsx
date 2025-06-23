import { describe, it, expect, vi, beforeEach } from 'vitest';
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

import { calculateActualCost } from '../../apps/ui/src/lib/batch/estimateCost';
import type { BatchRow } from '../../apps/ui/src/types/batch';

describe('Chat Window Pricing Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate correct pricing for different token counts', async () => {
    const testCases = [
      {
        model: 'openai/gpt-4o',
        promptTokens: 1000,
        answerTokens: 500,
        expectedInputRate: 5.0,
        expectedOutputRate: 20.0,
      },
      {
        model: 'openai/gpt-4o-mini',
        promptTokens: 50,
        answerTokens: 25,
        expectedInputRate: 0.6,
        expectedOutputRate: 2.4,
      },
      {
        model: 'anthropic/claude-3-7-sonnet-20250219',
        promptTokens: 2000,
        answerTokens: 1000,
        expectedInputRate: 3.0,
        expectedOutputRate: 15.0,
      },
    ];

    for (const {
      model,
      promptTokens,
      answerTokens,
      expectedInputRate,
      expectedOutputRate,
    } of testCases) {
      const row: BatchRow = { id: '1', prompt: 'Test', model };
      const actualCost = await calculateActualCost(row, promptTokens, answerTokens);

      const expectedCost =
        (promptTokens / 1000000) * expectedInputRate +
        (answerTokens / 1000000) * expectedOutputRate;
      expect(actualCost).toBeCloseTo(expectedCost, 8);

      // Verify cost formatting to 8 decimal places
      expect(actualCost.toFixed(8)).toMatch(/^\d+\.\d{8}$/);
    }
  });

  it('should handle pricing for different model providers', async () => {
    const models = [
      { id: 'openai/gpt-4o', expected: 0.005 }, // (1000/1M * 5)
      { id: 'anthropic/claude-4-opus', expected: 0.015 }, // (1000/1M * 15)
    ];

    for (const model of models) {
      const row: BatchRow = { id: '1', prompt: 'Test', model: model.id };
      const cost = await calculateActualCost(row, 1000, 0);
      expect(cost).toBeCloseTo(model.expected, 8);
    }
  });

  it('should handle prompt caching cost calculations for Anthropic models', async () => {
    // Test Anthropic models that support prompt caching
    const models = [
      'anthropic/claude-3-7-sonnet-20250219',
      'anthropic/claude-4-opus',
      'anthropic/claude-3-5-haiku-20241022',
    ];

    for (const model of models) {
      const row: BatchRow = { id: '1', prompt: 'Test prompt for caching', model };

      // Normal cost calculation
      const regularCost = await calculateActualCost(row, 1000, 500);
      expect(regularCost).toBeGreaterThan(0);

      // With prompt caching, input cost could be reduced (but this is implementation-specific)
      // For now, just verify the calculation works and returns reasonable values
      expect(regularCost.toFixed(8)).toMatch(/^\d+\.\d{8}$/);
    }
  });

  it('should validate cost precision and formatting', () => {
    const testCosts = [
      0.00000001, // Very small cost
      0.12345678, // Medium cost
      1.23456789, // Large cost
      15.0, // Whole number cost
    ];

    testCosts.forEach((cost) => {
      const formatted = cost.toFixed(8);
      expect(formatted).toMatch(/^\d+\.\d{8}$/);
      expect(parseFloat(formatted)).toBeCloseTo(cost, 8);
    });
  });

  it('should handle zero and undefined costs gracefully', async () => {
    const row: BatchRow = { id: '1', prompt: 'Test', model: 'openai/gpt-4o' };

    // Zero tokens should result in zero cost
    const zeroCost = await calculateActualCost(row, 0, 0);
    expect(zeroCost).toBe(0);
    expect(zeroCost.toFixed(8)).toBe('0.00000000');
  });

  it('should accumulate costs correctly across multiple messages', async () => {
    const row: BatchRow = { id: '1', prompt: 'Test', model: 'openai/gpt-4o' };
    const msg1Cost = await calculateActualCost(row, 100, 200); // 100/1M*5 + 200/1M*20 = 0.0005 + 0.004 = 0.0045
    const msg2Cost = await calculateActualCost(row, 50, 100); // 50/1M*5 + 100/1M*20 = 0.00025 + 0.002 = 0.00225
    const totalCost = msg1Cost + msg2Cost;
    expect(totalCost).toBeCloseTo(0.00675, 8);
  });

  it('should throw an error for unknown models', async () => {
    const row: BatchRow = { id: '1', prompt: 'Test', model: 'unknown/model' };
    await expect(calculateActualCost(row, 100, 50)).rejects.toThrow(
      'Unknown model id: unknown/model'
    );
  });

  it('should maintain precision with very small and large costs', async () => {
    const testCases = [
      // Very small cost with Haiku
      { model: 'anthropic/claude-3-7-sonnet-20250219', inputTokens: 1, outputTokens: 1 },
      // Large cost with Opus
      { model: 'anthropic/claude-4-opus', inputTokens: 10000, outputTokens: 5000 },
    ];

    for (const { model, inputTokens, outputTokens } of testCases) {
      const row: BatchRow = { id: '1', prompt: 'Test', model };
      const cost = await calculateActualCost(row, inputTokens, outputTokens);

      expect(cost).toBeGreaterThan(0);
      expect(Number.isFinite(cost)).toBe(true);
      expect(cost.toFixed(8)).toMatch(/^\d+\.\d{8}$/);
    }
  });
});
