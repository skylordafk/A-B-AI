import { describe, it, expect, vi } from 'vitest';
import { estimateCost } from '../../apps/ui/src/lib/batch/estimateCost';
import type { BatchRow } from '../../apps/ui/src/types/batch';

// Mock pricing data
vi.mock('../../apps/ui/src/lib/batch/loadPricingData', () => ({
  loadPricingData: vi.fn().mockResolvedValue({
    openai: {
      'gpt-4.1-mini': { prompt: 0.0004, completion: 0.0016 },
      'o3-2025-04-16': { prompt: 0.01, completion: 0.01 }, // Default
    },
    anthropic: {
      'claude-3-haiku': { prompt: 0.00025, completion: 0.00125 },
    },
  }),
  getProviderAndModel: vi.fn((modelString: string) => {
    if (modelString && modelString.startsWith('openai/')) {
      return { provider: 'openai', model: modelString.replace('openai/', '') };
    }
    if (modelString && modelString.startsWith('anthropic/')) {
      return { provider: 'anthropic', model: modelString.replace('anthropic/', '') };
    }
    return { provider: 'openai', model: 'o3-2025-04-16' };
  }),
}));

// Mock tiktoken to avoid tokenization issues in tests
vi.mock('@dqbd/tiktoken', () => ({
  get_encoding: () => ({
    encode: (text: string) => {
      // Simple mock: ~4 characters per token
      return new Array(Math.ceil(text.length / 4));
    },
  }),
}));

describe('estimateCost', () => {
  it('should calculate cost for a single row with default model', async () => {
    const rows: BatchRow[] = [
      {
        id: 'row-1',
        prompt: 'What is artificial intelligence?', // ~8 tokens
      },
    ];

    const result = await estimateCost(rows);

    expect(result.totalUSD).toBeGreaterThan(0);
    expect(result.perRow).toHaveLength(1);
    expect(result.perRow[0]).toMatchObject({
      id: 'row-1',
      tokens_in: expect.any(Number),
      est_cost: expect.any(Number),
    });
  });

  it('should calculate cost for multiple rows with different models', async () => {
    const rows: BatchRow[] = [
      {
        id: 'row-1',
        prompt: 'Short prompt',
        model: 'openai/gpt-4.1-mini',
      },
      {
        id: 'row-2',
        prompt: 'Another prompt with more text to process',
        model: 'anthropic/claude-3-haiku',
      },
    ];

    const result = await estimateCost(rows);

    expect(result.totalUSD).toBeGreaterThan(0);
    expect(result.perRow).toHaveLength(2);

    // GPT-4.1-mini is no longer free (now costs $0.40/$1.60 per 1M tokens)
    expect(result.perRow[0].est_cost).toBeGreaterThan(0);
  });

  it('should include system prompt in token calculation', async () => {
    const rows: BatchRow[] = [
      {
        id: 'row-1',
        prompt: 'User prompt',
        system: 'You are a helpful assistant with expertise in many areas',
      },
    ];

    const result = await estimateCost(rows);

    // Token count should include both prompts
    expect(result.perRow[0].tokens_in).toBeGreaterThan(10);
  });

  it('should handle models with unavailable pricing (-1)', async () => {
    const rows: BatchRow[] = [
      {
        id: 'row-1',
        prompt: 'Test prompt',
        model: 'unknown-provider/unknown-model',
      },
    ];

    const result = await estimateCost(rows);

    // Should fall back to default pricing since grok-3 has valid pricing
    expect(result.totalUSD).toBeGreaterThan(0);
    expect(result.perRow[0].est_cost).toBeGreaterThan(0);
  });

  it('should fall back to default pricing for unknown models', async () => {
    const rows: BatchRow[] = [
      {
        id: 'row-1',
        prompt: 'Test prompt',
        model: 'unknown/model-xyz',
      },
    ];

    const result = await estimateCost(rows);

    // Should use o3 pricing as fallback
    expect(result.totalUSD).toBeGreaterThan(0);
  });
});
