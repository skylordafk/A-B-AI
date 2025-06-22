import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the pricing data loading with correct per-1K-token pricing
vi.mock('../../apps/ui/src/lib/batch/loadPricingData', () => ({
  loadPricingData: vi.fn().mockResolvedValue({
    openai: {
      'gpt-4o': { prompt: 0.0025, completion: 0.005 },
      'gpt-4o-mini': { prompt: 0.0006, completion: 0.0024 },
      'o3-2025-04-16': { prompt: 0.002, completion: 0.008 }, // Fallback model
    },
    anthropic: {
      'claude-3-5-sonnet-20241022': { prompt: 0.003, completion: 0.015 },
      'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },
      'claude-opus-4-20250514': { prompt: 0.015, completion: 0.075 },
    },
    grok: {
      'grok-3': { prompt: 0.003, completion: 0.015 },
    },
    gemini: {
      'models/gemini-2.5-flash-preview': { prompt: 0.00035, completion: 0.00175 },
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

    return { provider: 'openai', model: modelString };
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
        expectedInputRate: 0.0025,
        expectedOutputRate: 0.005,
      },
      {
        model: 'openai/gpt-4o-mini',
        promptTokens: 50,
        answerTokens: 25,
        expectedInputRate: 0.0006,
        expectedOutputRate: 0.0024,
      },
      {
        model: 'anthropic/claude-3-5-sonnet-20241022',
        promptTokens: 2000,
        answerTokens: 1000,
        expectedInputRate: 0.003,
        expectedOutputRate: 0.015,
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
        (promptTokens / 1000) * expectedInputRate + (answerTokens / 1000) * expectedOutputRate;
      expect(actualCost).toBeCloseTo(expectedCost, 8);

      // Verify cost formatting to 8 decimal places
      expect(actualCost.toFixed(8)).toMatch(/^\d+\.\d{8}$/);
    }
  });

  it('should handle pricing for different model providers', async () => {
    const models = [
      { model: 'openai/gpt-4o', expectedInputRate: 0.0025 },
      { model: 'anthropic/claude-3-haiku-20240307', expectedInputRate: 0.00025 },
      { model: 'grok/grok-3', expectedInputRate: 0.003 },
      { model: 'gemini/models/gemini-2.5-flash-preview', expectedInputRate: 0.00035 },
    ];

    for (const { model, expectedInputRate } of models) {
      const row: BatchRow = { id: '1', prompt: 'Test', model };
      const cost = await calculateActualCost(row, 1000, 0); // Input-only cost

      const expectedCost = (1000 / 1000) * expectedInputRate;
      expect(cost).toBeCloseTo(expectedCost, 8);
      expect(cost).toBeGreaterThan(0);
    }
  });

  it('should handle prompt caching cost calculations for Anthropic models', async () => {
    // Test Anthropic models that support prompt caching
    const models = [
      'anthropic/claude-3-5-sonnet-20241022',
      'anthropic/claude-opus-4-20250514',
      'anthropic/claude-3-haiku-20240307',
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
    const conversations = [
      { model: 'openai/gpt-4o', inputTokens: 100, outputTokens: 50 },
      { model: 'openai/gpt-4o', inputTokens: 200, outputTokens: 100 },
      { model: 'openai/gpt-4o', inputTokens: 150, outputTokens: 75 },
    ];

    let totalCost = 0;

    for (const { model, inputTokens, outputTokens } of conversations) {
      const row: BatchRow = { id: Math.random().toString(), prompt: 'Test', model };
      const cost = await calculateActualCost(row, inputTokens, outputTokens);
      totalCost += cost;
    }

    // Verify total cost is reasonable
    expect(totalCost).toBeGreaterThan(0);
    expect(totalCost.toFixed(8)).toMatch(/^\d+\.\d{8}$/);

    // Verify individual costs sum correctly
    const manualTotal =
      (100 / 1000) * 0.0025 +
      (50 / 1000) * 0.005 + // First message
      (200 / 1000) * 0.0025 +
      (100 / 1000) * 0.005 + // Second message
      (150 / 1000) * 0.0025 +
      (75 / 1000) * 0.005; // Third message
    expect(totalCost).toBeCloseTo(manualTotal, 8);
  });

  it('should handle fallback pricing for unknown models', async () => {
    const row: BatchRow = { id: '1', prompt: 'Test', model: 'unknown/model' };
    const cost = await calculateActualCost(row, 100, 50);

    // Should use fallback o3-2025-04-16 pricing: $0.002 input, $0.008 output
    const expectedCost = (100 / 1000) * 0.002 + (50 / 1000) * 0.008;
    expect(cost).toBeCloseTo(expectedCost, 8);
  });

  it('should maintain precision with very small and large costs', async () => {
    const testCases = [
      // Very small cost with Haiku
      { model: 'anthropic/claude-3-haiku-20240307', inputTokens: 1, outputTokens: 1 },
      // Large cost with Opus
      { model: 'anthropic/claude-opus-4-20250514', inputTokens: 10000, outputTokens: 5000 },
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
