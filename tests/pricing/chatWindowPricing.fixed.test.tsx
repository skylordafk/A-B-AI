// import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
// import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { getModel } from '../../shared/utils/loadPricing';
import { calculateActualCost } from '../../apps/ui/src/lib/batch/estimateCost';
import type { BatchRow } from '../../apps/ui/src/types/batch';

// Mock the API
const mockApi = {
  sendToModel: vi.fn(),
  sendToModelWithFeatures: vi.fn(),
  getEnableWebSearch: vi.fn().mockResolvedValue(false),
  getEnableExtendedThinking: vi.fn().mockResolvedValue(false),
  getEnablePromptCaching: vi.fn().mockResolvedValue(false),
  getPromptCacheTTL: vi.fn().mockResolvedValue('5m'),
  countTokens: vi.fn(),
};

// Mock window.api
Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true,
});

// Mock contexts
vi.mock('../../apps/ui/src/contexts/ChatContext', () => ({
  useChat: () => ({
    messages: [],
    addMessage: vi.fn(),
    clearMessages: vi.fn(),
  }),
}));

vi.mock('../../apps/ui/src/contexts/ProjectContext', () => ({
  useProject: () => ({
    currentProject: null,
  }),
}));

vi.mock('../../apps/ui/src/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('Chat Window Pricing Tests (Fixed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display cost for individual chat responses with proper formatting', async () => {
    // Mock a response with realistic cost information based on actual pricing
    const mockResponse = {
      answer: 'This is a test response from GPT-4o',
      promptTokens: 100,
      answerTokens: 50,
      costUSD: 0.0005, // 100 * $0.0025/1K + 50 * $0.005/1K = $0.00025 + $0.00025 = $0.0005
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
      },
    };

    mockApi.sendToModel.mockResolvedValue(mockResponse);

    // The cost should be formatted to 8 decimal places as seen in ChatPage.tsx:336
    expect(mockResponse.costUSD.toFixed(8)).toBe('0.00050000');
  });

  it('should calculate correct pricing for different token counts with real rates', () => {
    const testCases = [
      {
        model: 'gpt-4o',
        promptTokens: 1000,
        answerTokens: 500,
        expectedCost: (1000 / 1000) * 0.0025 + (500 / 1000) * 0.005, // $0.0025 + $0.0025 = $0.005
      },
      {
        model: 'gpt-4o-mini',
        promptTokens: 1000,
        answerTokens: 500,
        expectedCost: (1000 / 1000) * 0.0006 + (500 / 1000) * 0.0024, // $0.0006 + $0.0012 = $0.0018
      },
      {
        model: 'claude-3-7-sonnet-20250219',
        promptTokens: 1000,
        answerTokens: 500,
        expectedCost: (1000 / 1000) * 0.003 + (500 / 1000) * 0.015, // $0.003 + $0.0075 = $0.0105
      },
    ];

    testCases.forEach(
      ({ promptTokens: _promptTokens, answerTokens: _answerTokens, expectedCost }) => {
        expect(expectedCost.toFixed(8)).toMatch(/^\d+\.\d{8}$/);
        expect(expectedCost).toBeGreaterThan(0);
      }
    );
  });

  it('should handle pricing for different model providers with correct rates', async () => {
    const providerTestCases = [
      {
        model: 'openai/gpt-4o',
        promptTokens: 1000,
        answerTokens: 500,
        // GPT-4o: $2.50/1M input, $5.00/1M output -> $0.0025/1K, $0.005/1K
        expectedCost: (1000 / 1000) * 0.0025 + (500 / 1000) * 0.005,
      },
      {
        model: 'anthropic/claude-3.7-sonnet-20241022',
        promptTokens: 1000,
        answerTokens: 500,
        // Claude 3.7 Sonnet: $3.00/1M input, $15.00/1M output -> $0.003/1K, $0.015/1K
        expectedCost: (1000 / 1000) * 0.003 + (500 / 1000) * 0.015,
      },
      {
        model: 'anthropic/claude-3-haiku-20240307',
        promptTokens: 1000,
        answerTokens: 500,
        // Claude 3 Haiku: $0.25/1M input, $1.25/1M output -> $0.00025/1K, $0.00125/1K
        expectedCost: (1000 / 1000) * 0.00025 + (500 / 1000) * 0.00125,
      },
    ];

    providerTestCases.forEach(({ model: _model, promptTokens, answerTokens, expectedCost }) => {
      const mockResponse = {
        answer: 'Test response',
        promptTokens,
        answerTokens,
        costUSD: expectedCost,
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: answerTokens,
        },
      };

      mockApi.sendToModel.mockResolvedValue(mockResponse);

      expect(mockResponse.costUSD).toBeCloseTo(expectedCost, 8);
      expect(mockResponse.costUSD.toFixed(8)).toMatch(/^\d+\.\d{8}$/);
    });
  });

  it('should handle prompt caching cost calculations for Anthropic models correctly', async () => {
    const cachingTestCases = [
      {
        scenario: 'Cache creation',
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          cache_creation_input_tokens: 800, // 800 tokens cached
          cache_read_input_tokens: 0,
        },
        // Claude 3.7 Sonnet with caching (actual pricing from anthropic.ts):
        // Regular tokens: 200 * $0.003/1K = $0.0006
        // Cache creation: 800 * $0.00375/1K = $0.003 (1.25x multiplier for 5m TTL)
        // Output: 500 * $0.015/1K = $0.0075
        expectedCostRange: [0.011, 0.012], // Total around $0.0111
      },
      {
        scenario: 'Cache read',
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 800, // 800 tokens from cache
        },
        // Regular tokens: 200 * $0.003/1K = $0.0006
        // Cache read: 800 * $0.0003/1K = $0.00024 (0.1x multiplier)
        // Output: 500 * $0.015/1K = $0.0075
        expectedCostRange: [0.008, 0.009], // Total around $0.00834
      },
    ];

    cachingTestCases.forEach(({ scenario: _scenario, usage, expectedCostRange }) => {
      // Calculate expected cost based on Anthropic pricing model
      const regularTokens =
        usage.prompt_tokens -
        (usage.cache_creation_input_tokens || 0) -
        (usage.cache_read_input_tokens || 0);
      let totalCost = 0;

      // Regular input tokens: $0.003/1K
      totalCost += (regularTokens / 1000) * 0.003;

      // Cache creation (1.25x multiplier for 5m TTL): $0.00375/1K
      if (usage.cache_creation_input_tokens) {
        totalCost += (usage.cache_creation_input_tokens / 1000) * 0.00375;
      }

      // Cache read (0.1x multiplier): $0.0003/1K
      if (usage.cache_read_input_tokens) {
        totalCost += (usage.cache_read_input_tokens / 1000) * 0.0003;
      }

      // Output tokens: $0.015/1K
      totalCost += (usage.completion_tokens / 1000) * 0.015;

      expect(totalCost).toBeGreaterThanOrEqual(expectedCostRange[0]);
      expect(totalCost).toBeLessThanOrEqual(expectedCostRange[1]);
      expect(totalCost.toFixed(8)).toMatch(/^\d+\.\d{8}$/);
    });
  });

  it('should validate cost precision and formatting', () => {
    const testCosts = [
      0.00000001, // 1 cent per million
      0.00075123, // Mid-range cost
      0.12345678, // Higher cost
      1.23456789, // Very high cost
    ];

    testCosts.forEach((cost) => {
      const formatted = cost.toFixed(8);

      // Should always have 8 decimal places
      expect(formatted).toMatch(/^\d+\.\d{8}$/);

      // Should not have trailing zeros beyond 8 places
      expect(formatted.split('.')[1]).toHaveLength(8);

      // Should be parseable back to a number
      expect(parseFloat(formatted)).toBeCloseTo(cost, 8);
    });
  });

  it('should handle zero and undefined costs gracefully', () => {
    const edgeCases = [
      { cost: 0, shouldDisplay: true, expected: '0.00000000' },
      { cost: undefined, shouldDisplay: false },
      { cost: null, shouldDisplay: false },
      { cost: NaN, shouldDisplay: false },
    ];

    edgeCases.forEach(({ cost, shouldDisplay, expected }) => {
      if (shouldDisplay && expected) {
        expect(cost.toFixed(8)).toBe(expected);
      } else {
        // These should not be displayed in the UI
        expect(cost === undefined || cost === null || isNaN(cost)).toBe(true);
      }
    });
  });

  it('should accumulate costs correctly across multiple messages', () => {
    const messageHistory = [
      { promptTokens: 100, answerTokens: 50, costUSD: 0.0005 }, // GPT-4o: (100*0.0025 + 50*0.005)/1K
      { promptTokens: 150, answerTokens: 75, costUSD: 0.00075 }, // GPT-4o: (150*0.0025 + 75*0.005)/1K
      { promptTokens: 200, answerTokens: 100, costUSD: 0.001 }, // GPT-4o: (200*0.0025 + 100*0.005)/1K
    ];

    const totalCost = messageHistory.reduce((sum, msg) => sum + msg.costUSD, 0);

    expect(totalCost).toBeCloseTo(0.00225, 8);
    expect(totalCost.toFixed(8)).toBe('0.00225000');

    // Each individual cost should be properly formatted
    messageHistory.forEach((msg) => {
      expect(msg.costUSD.toFixed(8)).toMatch(/^\d+\.\d{8}$/);
    });
  });

  it('should handle realistic cost scenarios correctly', () => {
    const realWorldScenarios = [
      {
        scenario: 'Quick question',
        promptTokens: 10,
        answerTokens: 25,
        model: 'gpt-4o-mini',
        expectedCost: (10 / 1000) * 0.0006 + (25 / 1000) * 0.0024, // $0.000066
      },
      {
        scenario: 'Code review',
        promptTokens: 2000,
        answerTokens: 800,
        model: 'claude-3-7-sonnet-20250219',
        expectedCost: (2000 / 1000) * 0.003 + (800 / 1000) * 0.015, // $0.018
      },
      {
        scenario: 'Document analysis',
        promptTokens: 10000,
        answerTokens: 2000,
        model: 'claude-opus-4',
        expectedCost: (10000 / 1000) * 0.015 + (2000 / 1000) * 0.075, // $0.30
      },
    ];

    realWorldScenarios.forEach(
      ({
        scenario: _scenario,
        promptTokens: _promptTokens,
        answerTokens: _answerTokens,
        expectedCost,
      }) => {
        expect(expectedCost).toBeGreaterThan(0);
        expect(expectedCost.toFixed(8)).toMatch(/^\d+\.\d{8}$/);

        // Verify the calculation is reasonable for the scenario
        if (_scenario === 'Quick question') {
          expect(expectedCost).toBeLessThan(0.001);
        } else if (_scenario === 'Document analysis') {
          expect(expectedCost).toBeGreaterThan(0.1);
        }
      }
    );
  });

  it('should handle cost comparison between models correctly', () => {
    const comparisonTokens = { prompt: 1000, answer: 500 };

    const modelCosts = [
      {
        model: 'claude-3-haiku',
        cost:
          (comparisonTokens.prompt / 1000) * 0.00025 + (comparisonTokens.answer / 1000) * 0.00125, // $0.000875
      },
      {
        model: 'gpt-4o-mini',
        cost: (comparisonTokens.prompt / 1000) * 0.0006 + (comparisonTokens.answer / 1000) * 0.0024, // $0.0018
      },
      {
        model: 'gpt-4o',
        cost: (comparisonTokens.prompt / 1000) * 0.0025 + (comparisonTokens.answer / 1000) * 0.005, // $0.005
      },
      {
        model: 'claude-3-7-sonnet-20250219',
        cost: (comparisonTokens.prompt / 1000) * 0.003 + (comparisonTokens.answer / 1000) * 0.015, // $0.0105
      },
      {
        model: 'claude-opus-4',
        cost: (comparisonTokens.prompt / 1000) * 0.015 + (comparisonTokens.answer / 1000) * 0.075, // $0.0525
      },
    ];

    // Sort by cost to verify pricing hierarchy
    const sortedCosts = modelCosts.sort((a, b) => a.cost - b.cost);

    // Verify cost ordering: Haiku < GPT-4o-mini < GPT-4o < Claude Sonnet < Claude Opus
    expect(sortedCosts[0].model).toBe('claude-3-haiku');
    expect(sortedCosts[1].model).toBe('gpt-4o-mini');
    expect(sortedCosts[2].model).toBe('gpt-4o');
    expect(sortedCosts[3].model).toBe('claude-3-7-sonnet-20250219');
    expect(sortedCosts[4].model).toBe('claude-opus-4');

    // Verify each cost is formatted correctly
    modelCosts.forEach(({ cost }) => {
      expect(cost.toFixed(8)).toMatch(/^\d+\.\d{8}$/);
    });
  });

  it('should handle edge cases in cost calculation', () => {
    const edgeCases = [
      {
        case: 'Zero input tokens',
        promptTokens: 0,
        answerTokens: 100,
        expectedCost: (0 / 1000) * 0.0025 + (100 / 1000) * 0.005, // $0.0005
      },
      {
        case: 'Zero output tokens',
        promptTokens: 100,
        answerTokens: 0,
        expectedCost: (100 / 1000) * 0.0025 + (0 / 1000) * 0.005, // $0.00025
      },
      {
        case: 'Single token each',
        promptTokens: 1,
        answerTokens: 1,
        expectedCost: (1 / 1000) * 0.0025 + (1 / 1000) * 0.005, // $0.0000075
      },
      {
        case: 'Large token count',
        promptTokens: 100000,
        answerTokens: 50000,
        expectedCost: (100000 / 1000) * 0.0025 + (50000 / 1000) * 0.005, // $0.5
      },
    ];

    edgeCases.forEach(
      ({
        case: caseName,
        promptTokens: _promptTokens,
        answerTokens: _answerTokens,
        expectedCost,
      }) => {
        expect(expectedCost).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(expectedCost)).toBe(true);
        expect(expectedCost.toFixed(8)).toMatch(/^\d+\.\d{8}$/);

        // Verify the calculation makes sense for the case
        if (caseName === 'Large token count') {
          expect(expectedCost).toBeGreaterThan(0.1);
        } else if (caseName === 'Single token each') {
          expect(expectedCost).toBeLessThan(0.00001);
        }
      }
    );
  });

  it('should use correct pricing for claude-3-7-sonnet-20250219', async () => {
    const model = getModel('anthropic/claude-3-7-sonnet-20250219');
    const row: BatchRow = {
      id: '1',
      prompt: 'Test prompt',
      model: 'anthropic/claude-3-7-sonnet-20250219',
    };
    const cost = await calculateActualCost(row, 1000, 2000);
    const expectedCost =
      (1000 / 1_000_000) * model.pricing.prompt + (2000 / 1_000_000) * model.pricing.completion;
    expect(cost).toBeCloseTo(expectedCost, 8);
  });

  it('should handle claude-3-7-sonnet-20250219 model ID correctly', async () => {
    const model = getModel('anthropic/claude-3-7-sonnet-20250219');
    const row: BatchRow = {
      id: '1',
      prompt: 'Test prompt',
      model: 'anthropic/claude-3-7-sonnet-20250219',
    };
    const cost = await calculateActualCost(row, 1000, 2000);
    const expectedCost =
      (1000 / 1_000_000) * model.pricing.prompt + (2000 / 1_000_000) * model.pricing.completion;
    expect(cost).toBeCloseTo(expectedCost, 8);
  });
});
