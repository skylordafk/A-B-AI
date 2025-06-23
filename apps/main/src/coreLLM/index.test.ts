import { describe, it, expect, vi, beforeEach } from 'vitest';
import { countTokens, calcCost, parseModelId, withRetries } from './index';

// Mock dependencies
vi.mock('@anthropic-ai/sdk');
vi.mock('@dqbd/tiktoken');

describe('CoreLLM Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).getApiKey = vi.fn();
  });

  describe('parseModelId', () => {
    it('should parse provider/model format correctly', () => {
      expect(parseModelId('openai/gpt-4o')).toEqual({
        provider: 'openai',
        model: 'gpt-4o',
      });

      expect(parseModelId('anthropic/claude-3-7-sonnet-20250219')).toEqual({
        provider: 'anthropic',
        model: 'claude-3-7-sonnet-20250219',
      });
    });

    it('should detect provider from model name when no prefix', () => {
      expect(parseModelId('claude-3-7-sonnet-20250219')).toEqual({
        provider: 'anthropic',
        model: 'claude-3-7-sonnet-20250219',
      });

      expect(parseModelId('gpt-4o')).toEqual({
        provider: 'openai',
        model: 'gpt-4o',
      });

      expect(parseModelId('gemini-1.5-pro')).toEqual({
        provider: 'gemini',
        model: 'gemini-1.5-pro',
      });

      expect(parseModelId('grok-3')).toEqual({
        provider: 'grok',
        model: 'grok-3',
      });
    });

    it('should default to openai for unknown models', () => {
      expect(parseModelId('unknown-model')).toEqual({
        provider: 'openai',
        model: 'unknown-model',
      });
    });
  });

  describe('calcCost', () => {
    it('should calculate basic cost correctly', () => {
      const tokens = { promptTokens: 1000, completionTokens: 500 };
      const pricing = { prompt: 3.0, completion: 15.0 };

      // Expected: (1000 * 3.0 + 500 * 15.0) / 1,000,000 = 0.0105
      expect(calcCost(tokens, pricing)).toBe(0.0105);
    });

    it('should calculate cost with cache tokens', () => {
      const tokens = {
        promptTokens: 1000,
        completionTokens: 500,
        cacheCreationTokens: 200,
        cacheReadTokens: 300,
      };
      const pricing = {
        prompt: 3.0,
        completion: 15.0,
        cacheWrite5m: 3.75,
        cacheRead: 0.3,
      };

      // Base: (1000 * 3.0 + 500 * 15.0) / 1M = 0.0105
      // Cache: (200 * 3.75 + 300 * 0.3) / 1M = 0.00084
      // Total: 0.0105 + 0.00084 = 0.01134
      expect(calcCost(tokens, pricing)).toBe(0.01134);
    });

    it('should return 0 for missing pricing', () => {
      const tokens = { promptTokens: 1000, completionTokens: 500 };
      expect(calcCost(tokens, null as any)).toBe(0);
    });
  });

  describe('withRetries', () => {
    it('should succeed on first try', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const result = await withRetries(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await withRetries(mockFn, { maxAttempts: 3, baseDelay: 10 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(withRetries(mockFn, { maxAttempts: 2, baseDelay: 10 })).rejects.toThrow(
        'persistent failure'
      );

      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('countTokens', () => {
    it('should use approximation for gemini and grok', async () => {
      const text = 'Hello world test';

      const geminiResult = await countTokens(text, 'gemini');
      const grokResult = await countTokens(text, 'grok');

      // Should use approximation (text.length / 4)
      expect(geminiResult).toBe(Math.ceil(text.length / 4));
      expect(grokResult).toBe(Math.ceil(text.length / 4));
    });
  });
});
