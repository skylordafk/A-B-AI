import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider, ChatResult, ChatMessage, ChatOptions } from './base';
import { ModelMeta } from '../types/model';
import { countTokens, calcCost, withRetries, TokenUsage } from '../coreLLM';
// Removed unused imports: AnthropicStream, readableFromAsyncIterable, calcCostFromLegacyPricing
// Removed unused PricingInfo import

const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';

const _ANTHROPIC_MODELS: { [key: string]: number } = {
  'claude-3-opus-20240229': 200000,
  'claude-3-7-sonnet-20250219': 200000,
  'claude-3-haiku-20240307': 200000,
  'claude-2.1': 200000,
  'claude-2.0': 100000,
  'claude-instant-1.2': 100000,
};

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
  const webSearchRequests = 0;

  // Check if we should use streaming (when onStreamChunk is provided and not a no-op function)
  const shouldStream = onStreamChunk && onStreamChunk.toString() !== '() => {}';

  if (shouldStream) {
    // Use streaming for interactive chat to avoid timeout issues
    const stream = await anthropic.messages.create(
      {
        ...requestConfig,
        stream: true,
      },
      { signal: abortSignal }
    );

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
        fullContent += chunk.delta.text;
        onStreamChunk(chunk.delta.text);
      } else if (chunk.type === 'message_delta' && chunk.usage) {
        usage = chunk.usage;
      }
    }

    // Get final usage if not provided in stream
    if (!usage.input_tokens && stream.message) {
      usage = stream.message.usage || {};
    }
  } else {
    // For batch processing, use non-streaming but with extended timeout
    try {
      const response = await anthropic.messages.create(
        {
          ...requestConfig,
          stream: false,
        },
        {
          signal: abortSignal,
          // Increase timeout for batch operations
          timeout: 600000, // 10 minutes
        }
      );

      fullContent = response.content[0]?.text || '';
      usage = response.usage || {};
    } catch (error: any) {
      // If it's a timeout error, retry with streaming using centralized retry logic
      if (error.message?.includes('Streaming is strongly recommended')) {
        console.warn('[Anthropic] Switching to streaming mode due to timeout warning');

        const result = await withRetries(
          async () => {
            const stream = await anthropic.messages.create(
              {
                ...requestConfig,
                stream: true,
              },
              { signal: abortSignal }
            );

            let streamContent = '';
            let streamUsage: any = {};

            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
                streamContent += chunk.delta.text;
              } else if (chunk.type === 'message_delta' && chunk.usage) {
                streamUsage = chunk.usage;
              }
            }

            return { content: streamContent, usage: streamUsage };
          },
          { maxAttempts: 2 }
        );

        fullContent = result.content;
        usage = result.usage;
      } else {
        throw error;
      }
    }
  }

  // Return in the same format as before
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
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude 3.7 Sonnet',
        description: "Anthropic's advanced reasoning model",
        contextSize: 200000,
        pricePrompt: 3.0,
        priceCompletion: 15.0,
      },
      {
        id: 'claude-4-sonnet',
        name: 'Claude 4 Sonnet',
        description: "Anthropic's next-generation mid-size model",
        contextSize: 200000,
        pricePrompt: 3.0,
        priceCompletion: 15.0,
      },
      {
        id: 'claude-4-opus',
        name: 'Claude 4 Opus',
        description: "Anthropic's most powerful model",
        contextSize: 200000,
        pricePrompt: 15.0,
        priceCompletion: 75.0,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        description: 'Fast and efficient Anthropic model',
        contextSize: 200000,
        pricePrompt: 0.8,
        priceCompletion: 4.0,
      },
      // Legacy models for backward compatibility
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Most powerful model for highly complex tasks.',
        contextSize: 200000,
        pricePrompt: 15.0,
        priceCompletion: 75.0,
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Fastest and most compact model for near-instant responsiveness.',
        contextSize: 200000,
        pricePrompt: 0.25,
        priceCompletion: 1.25,
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

    // Canonicalize the requested model id - strip provider prefix if present
    let model = modelId || DEFAULT_MODEL;
    if (model.includes('/')) {
      model = model.split('/')[1]; // Remove provider prefix like "anthropic/"
    }

    // Map frontend model IDs to API model names
    if (model === 'claude-4-sonnet') {
      model = 'claude-sonnet-4-20250514';
    } else if (model === 'claude-4-opus') {
      model = 'claude-opus-4-20250514';
    }

    // Get pricing from options (passed from ModelService)
    const pricing = options?.pricing;
    if (!pricing) {
      throw new Error(`No pricing information provided for model: ${model}`);
    }

    // Get max output tokens from global settings
    let maxOutputTokens = (globalThis as any).getMaxOutputTokens?.() || 4096;

    // Cap max tokens based on model limits
    if (model.includes('claude-3-5-sonnet') || model.includes('claude-3-5-haiku')) {
      maxOutputTokens = Math.min(maxOutputTokens, 8192);
    } else if (model.includes('claude-3')) {
      maxOutputTokens = Math.min(maxOutputTokens, 4096);
    }

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

    // Calculate cost using the centralized utility
    const tokens: TokenUsage = {
      promptTokens: res.usage.input_tokens,
      completionTokens: res.usage.output_tokens,
    };
    const costUSD = calcCost(tokens, pricing);

    return {
      answer,
      promptTokens: res.usage.input_tokens,
      answerTokens: res.usage.output_tokens,
      costUSD,
    };
  },

  // Native token counting for Claude models
  async countTokens(text: string): Promise<number> {
    return countTokens(text, 'anthropic');
  },

  // Batch API implementation for Anthropic
  // Note: Anthropic's batch API may not be fully available yet
  async submitBatch(_jobs: any[]): Promise<string> {
    console.warn('Anthropic batch processing is not yet implemented.');
    // In a real implementation, you would format and submit jobs to the Anthropic
    // batch API, then return a batch ID.
    return Promise.resolve(`batch-anthropic-${Date.now()}`);
  },

  async getBatchStatus(_batchId: string): Promise<any> {
    console.warn('Anthropic batch processing is not yet implemented.');
    return Promise.resolve({
      id: _batchId,
      status: 'completed', // Mock status
    });
  },

  async retrieveBatchResults(_batchId: string): Promise<any[]> {
    console.warn('Anthropic batch processing is not yet implemented.');
    return Promise.resolve([]); // Return empty array as no jobs were processed
  },
};
