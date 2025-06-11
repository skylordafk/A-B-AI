import { describe, it, expect, vi } from 'vitest';
import { loadPricingData, getProviderAndModel } from '../../apps/ui/src/lib/batch/loadPricingData';
import { calculateActualCost } from '../../apps/ui/src/lib/batch/estimateCost';
import type { BatchRow } from '../../apps/ui/src/types/batch';

// Mock fetch to return our pricing data
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    OpenAI: {
      'o3-2025-04-16': {
        input_price: '$2.00 per 1M tokens',
        output_price: '$8.00 per 1M tokens',
      },
      'gpt-4.1-mini': {
        input_price: '$0.40 per 1M tokens',
        output_price: '$1.60 per 1M tokens',
      },
    },
    Anthropic: {
      'claude-opus-4-20250514': {
        input_price: '$15 per 1M tokens',
        output_price: '$75 per 1M tokens',
      },
      'claude-3-haiku': {
        input_price: '$0.80 per 1M tokens',
        output_price: '$4.00 per 1M tokens',
      },
    },
    Google: {
      'gemini-2.5-pro-thinking': {
        input_price: '$1.25 per 1M tokens for <200K tokens, $2.50 per 1M tokens for >200K tokens',
        output_price:
          '$10.00 per 1M tokens for <200K tokens, $15.00 per 1M tokens for >200K tokens',
      },
      'gemini-2.5-flash-preview': {
        input_price: '$0.35 per 1M tokens',
        output_price: '$1.75 per 1M tokens',
      },
    },
    Grok: {
      'grok-3': {
        input_price: '$3.00 per 1M tokens',
        output_price: '$15.00 per 1M tokens',
      },
      'grok-3-mini': {
        input_price: '$0.30 per 1M tokens',
        output_price: '$0.50 per 1M tokens',
      },
    },
  }),
});

describe('Pricing Integration', () => {
  it('should load pricing data from JSON and convert correctly', async () => {
    const pricing = await loadPricingData();

    // Check OpenAI pricing
    expect(pricing.openai['o3-2025-04-16'].prompt).toBe(0.002); // $2 per 1M = $0.002 per 1K
    expect(pricing.openai['o3-2025-04-16'].completion).toBe(0.008); // $8 per 1M = $0.008 per 1K
    expect(pricing.openai['gpt-4.1-mini'].prompt).toBe(0.0004); // $0.40 per 1M = $0.0004 per 1K
    expect(pricing.openai['gpt-4.1-mini'].completion).toBe(0.0016); // $1.60 per 1M = $0.0016 per 1K

    // Check Anthropic pricing
    expect(pricing.anthropic['claude-opus-4-20250514'].prompt).toBe(0.015); // $15 per 1M = $0.015 per 1K
    expect(pricing.anthropic['claude-opus-4-20250514'].completion).toBe(0.075); // $75 per 1M = $0.075 per 1K
    expect(pricing.anthropic['claude-3-haiku'].prompt).toBe(0.0008); // $0.80 per 1M = $0.0008 per 1K
    expect(pricing.anthropic['claude-3-haiku'].completion).toBe(0.004); // $4.00 per 1M = $0.004 per 1K

    // Check Grok pricing
    expect(pricing.grok['grok-3'].prompt).toBe(0.003); // $3 per 1M = $0.003 per 1K
    expect(pricing.grok['grok-3'].completion).toBe(0.015); // $15 per 1M = $0.015 per 1K
    expect(pricing.grok['grok-3-mini'].prompt).toBe(0.0003); // $0.30 per 1M = $0.0003 per 1K
    expect(pricing.grok['grok-3-mini'].completion).toBe(0.0005); // $0.50 per 1M = $0.0005 per 1K

    // Check Gemini pricing (uses lower tier)
    expect(pricing.gemini['models/gemini-2.5-pro-thinking'].prompt).toBe(0.00125); // $1.25 per 1M = $0.00125 per 1K
    expect(pricing.gemini['models/gemini-2.5-pro-thinking'].completion).toBe(0.01); // $10 per 1M = $0.01 per 1K
    expect(pricing.gemini['models/gemini-2.5-flash-preview'].prompt).toBe(0.00035); // $0.35 per 1M = $0.00035 per 1K
    expect(pricing.gemini['models/gemini-2.5-flash-preview'].completion).toBe(0.00175); // $1.75 per 1M = $0.00175 per 1K
  });

  it('should calculate actual costs correctly for each model', async () => {
    const testCases = [
      {
        model: 'openai/o3-2025-04-16',
        tokensIn: 1000,
        tokensOut: 500,
        expectedCost: 0.006, // (1000/1000 * 0.002) + (500/1000 * 0.008) = 0.002 + 0.004 = 0.006
      },
      {
        model: 'openai/gpt-4.1-mini',
        tokensIn: 2000,
        tokensOut: 1000,
        expectedCost: 0.0024, // (2000/1000 * 0.0004) + (1000/1000 * 0.0016) = 0.0008 + 0.0016 = 0.0024
      },
      {
        model: 'anthropic/claude-opus-4-20250514',
        tokensIn: 1000,
        tokensOut: 1000,
        expectedCost: 0.09, // (1000/1000 * 0.015) + (1000/1000 * 0.075) = 0.015 + 0.075 = 0.09
      },
      {
        model: 'grok/grok-3',
        tokensIn: 1000,
        tokensOut: 1000,
        expectedCost: 0.018, // (1000/1000 * 0.003) + (1000/1000 * 0.015) = 0.003 + 0.015 = 0.018
      },
    ];

    for (const testCase of testCases) {
      const row: BatchRow = {
        id: 'test-1',
        prompt: 'test prompt',
        model: testCase.model,
      };

      const cost = await calculateActualCost(row, testCase.tokensIn, testCase.tokensOut);
      expect(cost).toBeCloseTo(testCase.expectedCost, 6);
    }
  });

  it('should parse provider and model correctly', () => {
    expect(getProviderAndModel('openai/o3-2025-04-16')).toEqual({
      provider: 'openai',
      model: 'o3-2025-04-16',
    });

    expect(getProviderAndModel('anthropic/claude-3-haiku')).toEqual({
      provider: 'anthropic',
      model: 'claude-3-haiku',
    });

    expect(getProviderAndModel('gemini/models/gemini-2.5-pro-thinking')).toEqual({
      provider: 'gemini',
      model: 'models/gemini-2.5-pro-thinking',
    });

    expect(getProviderAndModel('grok-3')).toEqual({
      provider: 'grok',
      model: 'grok-3',
    });

    expect(getProviderAndModel()).toEqual({
      provider: 'openai',
      model: 'o3-2025-04-16',
    });
  });
});
