import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider, ChatResult, ChatMessage, ChatOptions } from './base';
import { ModelMeta } from '../types/model';
import { countTokens, calcCost, withRetries, TokenUsage } from '../coreLLM';
// Removed unused PricingInfo import

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

        const result = await withRetries(async () => {
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
        }, { maxAttempts: 2 });

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
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        description:
          'Most intelligent model for complex reasoning tasks. Supports web search, extended thinking, and prompt caching.',
        contextSize: 200_000,
        pricePrompt: 15.0,
        priceCompletion: 75.0,
      },
      {
        id: 'claude-sonnet-4-20250514',
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
    // For now, implement a mock batch system or throw an error
    // When Anthropic releases their batch API, this can be updated
    throw new Error(
      'Anthropic Batch API is not yet available. Use regular chat API or OpenAI batch API instead.'
    );

    // Future implementation when Anthropic batch API is available:
    /*
    const apiKey = (globalThis as any).getApiKey?.('anthropic');
    if (!apiKey) throw new Error('Anthropic API key missing');

    const anthropic = new Anthropic({ apiKey });

    // Convert jobs to Anthropic batch format (when available)
    const batchRequests = jobs.map((job, index) => ({
      custom_id: `request-${index}`,
      params: {
        model: job.model || DEFAULT_MODEL,
        messages: [{ role: 'user', content: job.prompt }],
        max_tokens: job.maxTokens || 4096,
      },
    }));

    // Submit batch (when API is available)
    const batch = await anthropic.batches.create({
      requests: batchRequests,
    });

    return batch.id;
    */
  },

  async getBatchStatus(_batchId: string): Promise<any> {
    throw new Error(
      'Anthropic Batch API is not yet available. Use regular chat API or OpenAI batch API instead.'
    );

    // Future implementation:
    /*
    const apiKey = (globalThis as any).getApiKey?.('anthropic');
    if (!apiKey) throw new Error('Anthropic API key missing');

    const anthropic = new Anthropic({ apiKey });
    const batch = await anthropic.batches.retrieve(batchId);

    return {
      id: batch.id,
      status: batch.status,
      created_at: batch.created_at,
      completed_at: batch.completed_at,
      request_counts: batch.request_counts,
    };
    */
  },

  async retrieveBatchResults(_batchId: string): Promise<any[]> {
    throw new Error(
      'Anthropic Batch API is not yet available. Use regular chat API or OpenAI batch API instead.'
    );

    // Future implementation:
    /*
    const apiKey = (globalThis as any).getApiKey?.('anthropic');
    if (!apiKey) throw new Error('Anthropic API key missing');

    const anthropic = new Anthropic({ apiKey });
    const batch = await anthropic.batches.retrieve(batchId);

    if (batch.status !== 'completed') {
      throw new Error(`Batch not completed. Status: ${batch.status}`);
    }

    return batch.results.map(result => ({
      custom_id: result.custom_id,
      response: result.result?.content?.[0]?.text || '',
      error: result.error,
      status: result.error ? 'failed' : 'completed',
    }));
    */
  },
};
