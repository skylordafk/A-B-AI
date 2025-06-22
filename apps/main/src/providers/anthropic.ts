import Anthropic from '@anthropic-ai/sdk';
import { encoding_for_model } from '@dqbd/tiktoken';
import { BaseProvider, ChatResult, ChatMessage, ChatOptions } from './base';
import { ModelMeta } from '../types/model';

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

// Models that support web search tool
const _WEB_SEARCH_SUPPORTED_MODELS = [
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
  'claude-sonnet-4',
  'claude-3-7-sonnet',
];

// Models that support extended thinking
const _EXTENDED_THINKING_SUPPORTED_MODELS = [
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-sonnet-4',
  'claude-3-7-sonnet',
];

// Models that support prompt caching
const _PROMPT_CACHING_SUPPORTED_MODELS = [
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
  'claude-3-haiku-20240307',
  'claude-3-opus-20240229',
  'claude-sonnet-4',
  'claude-3-7-sonnet',
];

// Cache TTL options (unused after refactoring but kept for potential future use)
type _CacheTTL = '5m' | '1h';

// Handle streaming responses for real-time display
async function handleStreamingResponse(
  anthropic: any,
  requestConfig: any,
  onStreamChunk: (chunk: string) => void,
  abortSignal?: AbortSignal
): Promise<any> {
  let fullContent = '';
  let usage: any = {};
  const _citations: any[] = [];
  let webSearchRequests = 0;

  const stream = await anthropic.messages.create(requestConfig, { signal: abortSignal });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.text) {
      const chunk = event.delta.text;
      fullContent += chunk;
      onStreamChunk(chunk);
    } else if (event.type === 'message_delta' && event.usage) {
      usage = { ...usage, ...event.usage };
    } else if (event.type === 'server_tool_use' && event.name === 'web_search') {
      webSearchRequests++;
    }
  }

  // Return in the same format as non-streaming response
  return {
    content: [{ type: 'text', text: fullContent }],
    usage,
    webSearchRequests,
  };
}

// Removed hardcoded _MODEL_PRICING - now uses dynamic pricing from ModelService via ChatOptions

export const anthropicProvider: BaseProvider = {
  id: 'anthropic',
  label: 'Anthropic',

  getCapabilities() {
    return {
      supportsJsonMode: false,
      supportsBatchAPI: true,
      supportsStreaming: true,
      supportsPromptCaching: true,
      supportsExtendedThinking: true,
      supportsWebSearch: true,
    };
  },

  listModels(): ModelMeta[] {
    return [
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        description:
          'Most intelligent model for complex reasoning tasks. Supports web search, extended thinking, and prompt caching.',
        contextSize: 200_000,
        pricePrompt: 15.0,
        priceCompletion: 75.0,
      },
      {
        id: 'claude-sonnet-4',
        name: 'Claude Sonnet 4',
        description:
          'Optimal balance of intelligence, cost, and speed. Supports web search, extended thinking, and prompt caching.',
        contextSize: 200_000,
        pricePrompt: 3.0,
        priceCompletion: 15.0,
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description:
          'Enhanced intelligence and speed, excellent for coding. Supports extended thinking and prompt caching.',
        contextSize: 200_000,
        pricePrompt: 3.0,
        priceCompletion: 15.0,
      },
      {
        id: 'claude-3-5-haiku',
        name: 'Claude 3.5 Haiku',
        description:
          'Fastest, most cost-effective model for simple tasks. Supports prompt caching.',
        contextSize: 200_000,
        pricePrompt: 0.8,
        priceCompletion: 4.0,
      },
      {
        id: 'claude-3-7-sonnet',
        name: 'Claude 3.7 Sonnet',
        description:
          'Enhanced Sonnet model with improved capabilities. Supports web search and prompt caching.',
        contextSize: 200_000,
        pricePrompt: 3.0,
        priceCompletion: 15.0,
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Fast and economical model for simple tasks. Supports prompt caching.',
        contextSize: 200_000,
        pricePrompt: 0.25,
        priceCompletion: 1.25,
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus (Legacy)',
        description: 'Legacy high-capability model. Supports prompt caching.',
        contextSize: 200_000,
        pricePrompt: 15.0,
        priceCompletion: 75.0,
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet (Legacy)',
        description: 'Legacy balanced model. Supports prompt caching.',
        contextSize: 200_000,
        pricePrompt: 3.0,
        priceCompletion: 15.0,
      },
    ];
  },

  async chat(userPrompt: string, modelId?: string, options?: ChatOptions): Promise<ChatResult> {
    // Convert single prompt to messages format and use the new method
    return this.chatWithHistory([{ role: 'user', content: userPrompt }], modelId, options);
  },

  async chatWithHistory(
    messages: ChatMessage[],
    modelId?: string,
    options?: ChatOptions
  ): Promise<ChatResult> {
    const apiKey = (globalThis as any).getApiKey?.('anthropic');
    if (!apiKey) throw new Error('Anthropic API key missing');

    const anthropic = new Anthropic({ apiKey });

    // Canonicalize the requested model id
    const model = modelId || DEFAULT_MODEL;

    // Get pricing from options (passed from ModelService)
    const pricing = options?.pricing;
    if (!pricing) {
      throw new Error(`No pricing information provided for model: ${model}`);
    }

    // Get max output tokens from global settings
    const maxOutputTokens = (globalThis as any).getMaxOutputTokens?.() || 4096;

    // Prepare messages for Anthropic API
    const systemPrompt = messages.find((m) => m.role === 'system')?.content;
    const userMessages = messages.filter((m) => m.role !== 'system');

    const res = await handleStreamingResponse(
      anthropic,
      {
        model,
        system: systemPrompt,
        messages: userMessages,
        max_tokens: maxOutputTokens,
      },
      options?.onStreamChunk || (() => {}),
      options?.abortSignal
    );

    const answer = res.content[0]?.text ?? 'No response';

    // Calculate cost using the dynamic pricing from ModelService
    const costUSD =
      (res.usage.input_tokens / 1000) * (pricing.prompt / 1000) +
      (res.usage.output_tokens / 1000) * (pricing.completion / 1000);

    return {
      answer,
      promptTokens: res.usage.input_tokens,
      answerTokens: res.usage.output_tokens,
      costUSD,
    };
  },

  // Native token counting for Claude models
  async countTokens(text: string): Promise<number> {
    const apiKey = (globalThis as any).getApiKey?.('anthropic');
    if (!apiKey) throw new Error('Anthropic API key missing');

    const anthropic = new Anthropic({ apiKey });

    try {
      // Use Claude's native token counting API
      const response = await anthropic.messages.countTokens({
        model: 'claude-3-5-sonnet-20241022', // Use a standard model for counting
        messages: [{ role: 'user', content: text }],
      });

      return response.input_tokens;
    } catch (error) {
      console.error('[Anthropic] Native token counting failed:', error);
      // Fallback to tiktoken approximation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enc = encoding_for_model('gpt-4' as any);
      return enc.encode(text).length;
    }
  },
};
