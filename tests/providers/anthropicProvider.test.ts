import { describe, it, expect, vi, beforeEach } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';

// Mock dependencies
vi.mock('@anthropic-ai/sdk');
vi.mock('@dqbd/tiktoken', () => ({
  encoding_for_model: vi.fn(() => ({
    encode: vi.fn((text: string) => new Array(Math.ceil(text.length / 4))),
  })),
}));

const mockAnthropic = {
  messages: {
    create: vi.fn(),
    countTokens: vi.fn(),
  },
};

const mockEncoding = {
  encode: vi.fn(),
};

vi.mocked(Anthropic).mockImplementation(() => mockAnthropic as any);

// Mock global functions
(globalThis as any).getApiKey = vi.fn();
(globalThis as any).getEnableWebSearch = vi.fn(() => false);
(globalThis as any).getEnableExtendedThinking = vi.fn(() => false);
(globalThis as any).getMaxWebSearchUses = vi.fn(() => 5);
(globalThis as any).getEnablePromptCaching = vi.fn(() => false);
(globalThis as any).getPromptCacheTTL = vi.fn(() => '5m');
(globalThis as any).getMaxOutputTokens = vi.fn(() => 8192);

import { anthropicProvider } from '../../apps/main/src/providers/anthropic';

describe('Anthropic Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEncoding.encode.mockReturnValue(new Array(10)); // Mock 10 tokens
  });

  describe('listModels', () => {
    it('should return list of available models', () => {
      const models = anthropicProvider.listModels();

      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);

      const opusModel = models.find((m) => m.id === 'claude-opus-4-20250514');
      expect(opusModel).toBeDefined();
      expect(opusModel?.name).toBe('Claude Opus 4');
      expect(opusModel?.pricePrompt).toBe(15.0);
      expect(opusModel?.priceCompletion).toBe(75.0);
    });

    it('should include context size for all models', () => {
      const models = anthropicProvider.listModels();

      models.forEach((model) => {
        expect(model).toHaveProperty('contextSize');
        expect(typeof model.contextSize).toBe('number');
        expect(model.contextSize).toBeGreaterThan(0);
      });
    });
  });

  describe('chat', () => {
    beforeEach(() => {
      (globalThis as any).getApiKey.mockReturnValue('test-api-key');
    });

    it('should throw error when API key is missing', async () => {
      (globalThis as any).getApiKey.mockReturnValue(undefined);

      await expect(anthropicProvider.chat('Hello')).rejects.toThrow('Anthropic API key missing');
    });

    it('should make API call with correct parameters', async () => {
      const _mockResponse = {
        content: [{ type: 'text', text: 'Hello response' }],
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      // Mock streaming response
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Hello ' } };
          yield { type: 'content_block_delta', delta: { text: 'response' } };
          yield { type: 'message_delta', usage: { input_tokens: 10, output_tokens: 20 } };
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(mockAsyncIterator);

      const result = await anthropicProvider.chat('Hello', 'claude-3-5-sonnet-20241022');

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-sonnet-latest',
          messages: [{ role: 'user', content: 'Hello' }],
          stream: true,
          max_tokens: 8192,
        })
      );

      expect(result).toMatchObject({
        answer: 'Hello response',
        promptTokens: expect.any(Number),
        answerTokens: expect.any(Number),
        costUSD: expect.any(Number),
      });
    });

    it('should handle model name mapping correctly', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Response' } };
        },
      };
      mockAnthropic.messages.create.mockResolvedValue(mockAsyncIterator);

      await anthropicProvider.chat('Hello', 'claude-sonnet-4');

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
        })
      );
    });

    it('should enable web search when configured', async () => {
      (globalThis as any).getEnableWebSearch.mockReturnValue(true);

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Response' } };
        },
      };
      mockAnthropic.messages.create.mockResolvedValue(mockAsyncIterator);

      await anthropicProvider.chat('Hello', 'claude-3-5-sonnet-latest');

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 8192,
          messages: [{ role: 'user', content: 'Hello' }],
          model: 'claude-3-5-sonnet-latest',
          stream: true,
          tools: expect.any(Array),
        })
      );
    });

    it('should enable extended thinking when configured', async () => {
      (globalThis as any).getEnableExtendedThinking.mockReturnValue(true);

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Response' } };
        },
      };
      mockAnthropic.messages.create.mockResolvedValue(mockAsyncIterator);

      await anthropicProvider.chat('Hello', 'claude-opus-4-20250514');

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          thinking: {
            type: 'enabled',
            budget_tokens: expect.any(Number),
          },
        })
      );
    });

    it('should calculate cost correctly', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Response' } };
          yield { type: 'message_delta', usage: { input_tokens: 100, output_tokens: 50 } };
        },
      };
      mockAnthropic.messages.create.mockResolvedValue(mockAsyncIterator);

      const result = await anthropicProvider.chat('Hello', 'claude-3-5-sonnet-20241022');

      // For claude-3-5-sonnet: $3/1M input, $15/1M output
      // 100 input tokens = 100/1000 * 3/1000 = 0.0003
      // 50 output tokens = 50/1000 * 15/1000 = 0.00075
      // Total = 0.00105
      expect(result.costUSD).toBeCloseTo(0.00105, 5);
    });
  });

  describe('chatWithHistory', () => {
    beforeEach(() => {
      (globalThis as any).getApiKey.mockReturnValue('test-api-key');
    });

    it('should support message history', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Response' } };
        },
      };
      mockAnthropic.messages.create.mockResolvedValue(mockAsyncIterator);

      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ];

      await anthropicProvider.chatWithHistory(messages);

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: messages,
        })
      );
    });

    it('should support system prompts', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Response' } };
        },
      };
      mockAnthropic.messages.create.mockResolvedValue(mockAsyncIterator);

      await anthropicProvider.chatWithHistory([{ role: 'user', content: 'Hello' }], undefined, {
        systemPrompt: 'You are a helpful assistant.',
      });

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful assistant.',
        })
      );
    });

    it('should support prompt caching for system prompts', async () => {
      (globalThis as any).getEnablePromptCaching.mockReturnValue(true);

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Response' } };
        },
      };
      mockAnthropic.messages.create.mockResolvedValue(mockAsyncIterator);

      await anthropicProvider.chatWithHistory(
        [{ role: 'user', content: 'Hello' }],
        'claude-3-5-sonnet-latest',
        {
          systemPrompt: 'You are a helpful assistant.',
          cacheSystemPrompt: true,
          enablePromptCaching: true,
        }
      );

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.anything(),
        })
      );
    });

    it('should handle streaming chunks', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'Hello ' } };
          yield { type: 'content_block_delta', delta: { text: 'world!' } };
        },
      };
      mockAnthropic.messages.create.mockResolvedValue(mockAsyncIterator);

      const chunks: string[] = [];
      const onStreamChunk = (chunk: string) => chunks.push(chunk);

      await anthropicProvider.chatWithHistory([{ role: 'user', content: 'Hello' }], undefined, {
        onStreamChunk,
      });

      expect(chunks).toEqual(['Hello ', 'world!']);
    });
  });

  describe('countTokens', () => {
    beforeEach(() => {
      (globalThis as any).getApiKey.mockReturnValue('test-api-key');
    });

    it('should use native token counting when available', async () => {
      mockAnthropic.messages.countTokens.mockResolvedValue({ input_tokens: 15 });

      const result = await anthropicProvider.countTokens('Hello world');

      expect(mockAnthropic.messages.countTokens).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello world' }],
      });
      expect(result).toBe(15);
    });

    it('should fallback to tiktoken when native counting fails', async () => {
      mockAnthropic.messages.countTokens.mockRejectedValue(new Error('API Error'));
      mockEncoding.encode.mockReturnValue(new Array(12)); // 12 tokens

      const result = await anthropicProvider.countTokens('Hello world');

      expect(result).toBe(12);
    });

    it('should throw error when API key is missing', async () => {
      (globalThis as any).getApiKey.mockReturnValue(undefined);

      await expect(anthropicProvider.countTokens('Hello')).rejects.toThrow(
        'Anthropic API key missing'
      );
    });
  });
});
