import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estimateCost } from '../../apps/ui/src/lib/batch/estimateCost';
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
    // Fallback for tests that might not provide a full ID
    if (id === 'default') {
      return modelPricingData.find((m) => m.id === 'gpt-4o');
    }
    throw new Error(`Unknown model id: ${id}`);
  }),
}));

// Mock the api for token counting
const mockApi = {
  countTokens: vi.fn(),
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'api', {
    value: mockApi,
    writable: true,
  });
}

describe('estimateCost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.countTokens.mockImplementation((text: string) =>
      Promise.resolve(Math.ceil(text.length / 4))
    );
  });

  it('should calculate cost for a single row with default model', async () => {
    const rows: BatchRow[] = [
      {
        id: 'row-1',
        prompt: 'What is artificial intelligence?', // 31 chars -> 8 tokens
        model: 'default', // Uses fallback gpt-4o
      },
    ];

    const result = await estimateCost(rows);
    const expectedCost = (8 / 1000000) * 5.0; // 8 tokens * $5.0/M for gpt-4o

    expect(result.totalUSD).toBeCloseTo(expectedCost, 8);
    expect(result.perRow).toHaveLength(1);
    expect(result.perRow[0]).toMatchObject({
      id: 'row-1',
      tokens_in: 8,
      est_cost: expectedCost,
    });
  });

  it('should calculate cost for multiple rows with different models', async () => {
    const rows: BatchRow[] = [
      {
        id: 'row-1',
        prompt: 'Short prompt', // 12 chars
        model: 'openai/gpt-4o-mini',
        data: { var1: 'variable one' }, // 12 chars
      },
      {
        id: 'row-2',
        prompt: 'Another prompt', // 14 chars
        model: 'anthropic/claude-3-7-sonnet-20250219',
        data: { var2: 'variable two' }, // 12 chars
      },
    ];

    const result = await estimateCost(rows);
    // Row 1: 'Short prompt\nvariable one' -> 25 chars -> 7 tokens
    const cost1 = (7 / 1000000) * 0.6;
    // Row 2: 'Another prompt\nvariable two' -> 27 chars -> 7 tokens
    const cost2 = (7 / 1000000) * 3.0;

    expect(result.totalUSD).toBeCloseTo(cost1 + cost2, 8);
    expect(result.perRow).toHaveLength(2);
    expect(result.perRow[0].tokens_in).toBe(7);
    expect(result.perRow[1].tokens_in).toBe(7);
    expect(result.perRow[0].est_cost).toBeCloseTo(cost1, 8);
    expect(result.perRow[1].est_cost).toBeCloseTo(cost2, 8);
  });

  it('should include system prompt in token calculation', async () => {
    const rows: BatchRow[] = [
      {
        id: 'row-1',
        prompt: 'User prompt',
        system: 'You are a helpful assistant with expertise in many areas',
        model: 'openai/gpt-4o',
      },
    ];

    // system (55) + prompt (11) + separators = ~18 tokens
    const combined = 'You are a helpful assistant with expertise in many areas\n\nUser prompt';
    const expectedTokens = Math.ceil(combined.length / 4);

    const result = await estimateCost(rows);

    expect(result.perRow[0].tokens_in).toBe(expectedTokens);
    const expectedCost = (expectedTokens / 1000000) * 5.0;
    expect(result.perRow[0].est_cost).toBeCloseTo(expectedCost, 8);
  });

  it('should throw an error for unknown models', async () => {
    const rows: BatchRow[] = [
      {
        id: 'row-1',
        prompt: 'Test prompt',
        model: 'unknown-provider/unknown-model',
      },
    ];

    await expect(estimateCost(rows)).rejects.toThrow(
      'Unknown model id: unknown-provider/unknown-model'
    );
  });
});
