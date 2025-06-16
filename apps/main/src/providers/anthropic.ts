import Anthropic from '@anthropic-ai/sdk';
import { encoding_for_model } from '@dqbd/tiktoken';
import { BaseProvider, ChatResult, ChatMessage } from './base';
import { ModelMeta } from '../types/model';

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

// Models that support web search tool
const WEB_SEARCH_SUPPORTED_MODELS = [
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
  'claude-sonnet-4',
  'claude-3-7-sonnet',
];

// Models that support extended thinking
const EXTENDED_THINKING_SUPPORTED_MODELS = [
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-sonnet-4',
  'claude-3-7-sonnet',
];

// Models that support prompt caching
const PROMPT_CACHING_SUPPORTED_MODELS = [
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

// Cache TTL options
type CacheTTL = '5m' | '1h';

// Handle streaming responses for real-time display
async function handleStreamingResponse(
  anthropic: any,
  requestConfig: any,
  onStreamChunk: (chunk: string) => void
): Promise<any> {
  let fullContent = '';
  let usage: any = {};
  const _citations: any[] = [];
  let webSearchRequests = 0;

  const stream = await anthropic.messages.create(requestConfig);

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

// Model pricing map (per 1M tokens) - Updated with prompt caching prices
const MODEL_PRICING: Record<
  string,
  {
    input: number;
    output: number;
    cacheWrite5m: number;
    cacheWrite1h: number;
    cacheRead: number;
  }
> = {
  // Current generation models
  'claude-opus-4-20250514': {
    input: 15.0,
    output: 75.0,
    cacheWrite5m: 18.75, // 1.25x base
    cacheWrite1h: 30.0, // 2x base
    cacheRead: 1.5, // 0.1x base
  },
  'claude-3-5-sonnet-20241022': {
    input: 3.0,
    output: 15.0,
    cacheWrite5m: 3.75,
    cacheWrite1h: 6.0,
    cacheRead: 0.3,
  },
  'claude-3-haiku-20240307': {
    input: 0.25,
    output: 1.25,
    cacheWrite5m: 0.3,
    cacheWrite1h: 0.5,
    cacheRead: 0.03,
  },
  // New models
  'claude-sonnet-4': {
    input: 3.0,
    output: 15.0,
    cacheWrite5m: 3.75,
    cacheWrite1h: 6.0,
    cacheRead: 0.3,
  },
  'claude-3-5-haiku': {
    input: 0.8,
    output: 4.0,
    cacheWrite5m: 1.0,
    cacheWrite1h: 1.6,
    cacheRead: 0.08,
  },
  'claude-3-5-sonnet': {
    input: 3.0,
    output: 15.0,
    cacheWrite5m: 3.75,
    cacheWrite1h: 6.0,
    cacheRead: 0.3,
  },
  'claude-3-sonnet-20240229': {
    input: 3.0,
    output: 15.0,
    cacheWrite5m: 3.75,
    cacheWrite1h: 6.0,
    cacheRead: 0.3,
  },
  'claude-3-opus-20240229': {
    input: 15.0,
    output: 75.0,
    cacheWrite5m: 18.75,
    cacheWrite1h: 30.0,
    cacheRead: 1.5,
  },
  'claude-3-7-sonnet': {
    input: 3.0,
    output: 15.0,
    cacheWrite5m: 3.75,
    cacheWrite1h: 6.0,
    cacheRead: 0.3,
  },
  // Backwards compatibility aliases
  'claude-3-haiku': {
    input: 0.25,
    output: 1.25,
    cacheWrite5m: 0.3,
    cacheWrite1h: 0.5,
    cacheRead: 0.03,
  },
};

export const anthropicProvider: BaseProvider = {
  id: 'anthropic',
  label: 'Anthropic',

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

  async chat(userPrompt: string, modelId?: string): Promise<ChatResult> {
    // Convert single prompt to messages format and use the new method
    return this.chatWithHistory([{ role: 'user', content: userPrompt }], modelId);
  },

  async chatWithHistory(
    messages: ChatMessage[],
    modelId?: string,
    options?: {
      enablePromptCaching?: boolean;
      cacheTTL?: CacheTTL;
      systemPrompt?: string;
      cacheSystemPrompt?: boolean;
      enableStreaming?: boolean;
      onStreamChunk?: (chunk: string) => void;
    }
  ): Promise<ChatResult> {
    const apiKey = (globalThis as any).getApiKey?.('anthropic');
    if (!apiKey) throw new Error('Anthropic API key missing');

    const anthropic = new Anthropic({ apiKey });

    // Determine which model to use
    let model = DEFAULT_MODEL;
    if (modelId) {
      // Extract just the model name if it includes provider prefix
      const modelName = modelId.includes('/') ? modelId.split('/')[1] : modelId;

      // Map common model names to actual API model IDs
      if (
        modelName === 'claude-opus-4-20250514' ||
        modelName.includes('opus-4') ||
        modelName === 'claude-opus-4'
      ) {
        model = 'claude-opus-4-20250514';
      } else if (modelName === 'claude-sonnet-4' || modelName.includes('sonnet-4')) {
        model = 'claude-sonnet-4-20250514'; // Use the full model name for latest features
      } else if (
        modelName === 'claude-3-5-sonnet-20241022' ||
        modelName === 'claude-3-5-sonnet' ||
        (modelName.includes('3.5') && modelName.includes('sonnet'))
      ) {
        model = 'claude-3-5-sonnet-latest'; // Use latest for web search support
      } else if (
        modelName === 'claude-3-5-haiku' ||
        (modelName.includes('3.5') && modelName.includes('haiku'))
      ) {
        model = 'claude-3-5-haiku-latest'; // Use latest for web search support
      } else if (
        modelName === 'claude-3-7-sonnet' ||
        (modelName.includes('3.7') && modelName.includes('sonnet'))
      ) {
        model = 'claude-3-7-sonnet-20250219'; // Use specific date for web search support
      } else if (
        modelName === 'claude-3-haiku-20240307' ||
        modelName === 'claude-3-haiku' ||
        (modelName.includes('3') && modelName.includes('haiku') && !modelName.includes('3.5'))
      ) {
        model = 'claude-3-haiku-20240307';
      } else if (
        modelName === 'claude-3-opus-20240229' ||
        (modelName.includes('3') && modelName.includes('opus') && !modelName.includes('opus-4'))
      ) {
        model = 'claude-3-opus-20240229';
      } else if (
        modelName === 'claude-3-sonnet-20240229' ||
        (modelName.includes('3') &&
          modelName.includes('sonnet') &&
          !modelName.includes('3.5') &&
          !modelName.includes('3.7'))
      ) {
        model = 'claude-3-sonnet-20240229';
      }
    }

    // Get settings for advanced features
    const enableWebSearch = (globalThis as any).getEnableWebSearch?.() ?? false;
    const enableExtendedThinking = (globalThis as any).getEnableExtendedThinking?.() ?? false;
    const maxWebSearchUses = (globalThis as any).getMaxWebSearchUses?.() ?? 5;
    const enablePromptCaching =
      options?.enablePromptCaching ?? (globalThis as any).getEnablePromptCaching?.() ?? false;
    const cacheTTL = options?.cacheTTL ?? (globalThis as any).getPromptCacheTTL?.() ?? '5m';

    // Get pricing for the selected model
    const pricing = MODEL_PRICING[model] || MODEL_PRICING[DEFAULT_MODEL];

    // Use gpt-4 encoding as approximation for Claude
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enc = encoding_for_model('gpt-4' as any);

    // Count tokens for all messages
    const allMessageText = messages.map((m) => m.content).join('\n');
    const promptTokens = enc.encode(allMessageText).length;

    // Convert our messages to Anthropic format
    const anthropicMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get max output tokens setting (0 means no limit)
    const maxOutputTokens = (globalThis as any).getMaxOutputTokens?.() ?? 8192;

    // Build request configuration
    const requestConfig: any = {
      model,
      messages: anthropicMessages,
    };

    // Add system prompt with optional caching
    if (options?.systemPrompt) {
      if (
        enablePromptCaching &&
        options.cacheSystemPrompt &&
        PROMPT_CACHING_SUPPORTED_MODELS.includes(model)
      ) {
        requestConfig.system = [
          {
            type: 'text',
            text: options.systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ];
      } else {
        requestConfig.system = options.systemPrompt;
      }
    }

    // Model-specific maximum output token limits
    const MODEL_MAX_TOKENS: Record<string, number> = {
      'claude-opus-4-20250514': 32000,
      'claude-sonnet-4-20250514': 32000,
      'claude-3-7-sonnet-20250219': 32000,
      'claude-3-5-sonnet-latest': 8192,
      'claude-3-5-haiku-latest': 8192,
      'claude-3-5-sonnet-20241022': 8192,
      'claude-3-5-haiku': 8192,
      'claude-3-haiku-20240307': 4096,
      'claude-3-opus-20240229': 4096,
      'claude-3-sonnet-20240229': 4096,
      'claude-sonnet-4': 32000,
      'claude-3-7-sonnet': 32000,
    };

    // Set max_tokens with model-specific limits
    const modelMaxTokens = MODEL_MAX_TOKENS[model] || 8192;
    if (maxOutputTokens > 0) {
      // Use user setting but cap at model maximum
      requestConfig.max_tokens = Math.min(maxOutputTokens, modelMaxTokens);
    } else {
      // When user sets 0 (no limit), use model's maximum
      requestConfig.max_tokens = modelMaxTokens;
    }

    // Add extended thinking support if enabled and supported by model
    if (enableExtendedThinking && EXTENDED_THINKING_SUPPORTED_MODELS.includes(model)) {
      // Calculate thinking budget as a percentage of max tokens, but with reasonable bounds
      const thinkingBudget = Math.min(
        Math.max(1024, Math.floor(requestConfig.max_tokens * 0.4)), // 40% of max tokens, minimum 1024
        Math.max(1024, requestConfig.max_tokens - 2000) // Reserve at least 2000 tokens for response
      );

      requestConfig.thinking = {
        type: 'enabled',
        budget_tokens: thinkingBudget,
      };
    }

    // Add tools if web search is enabled and supported by model
    if (enableWebSearch && WEB_SEARCH_SUPPORTED_MODELS.includes(model)) {
      // web_search_20250305 is a completely predefined built-in tool type
      const tools: any[] = [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: maxWebSearchUses,
        },
      ];

      // Add cache control to tools if prompt caching is enabled
      if (enablePromptCaching && PROMPT_CACHING_SUPPORTED_MODELS.includes(model)) {
        tools[tools.length - 1].cache_control = { type: 'ephemeral' };
      }

      requestConfig.tools = tools;

      // Token-efficient tool use instructions
      if (!requestConfig.system && options?.systemPrompt) {
        requestConfig.system =
          options.systemPrompt +
          '\n\nTool Use Guidelines:\n- Only use web_search when you need current/real-time information\n- Be specific and focused in search queries\n- Avoid redundant searches';
      }
    }

    // Always enable streaming to avoid 10-minute timeout issues
    requestConfig.stream = true;

    const res = await handleStreamingResponse(
      anthropic,
      requestConfig,
      options?.onStreamChunk || (() => {})
    );

    // Extract text content from response - handle both simple text and complex responses with citations
    let answer = '';
    const citations: any[] = [];
    let webSearchRequests = 0;

    // Handle response content which can include text, tool usage, and citations
    for (const content of res.content) {
      if (content.type === 'text') {
        answer += content.text;
        // Check for citations in text content
        if ('citations' in content && content.citations) {
          citations.push(...content.citations);
        }
      } else if (content.type === 'server_tool_use' && content.name === 'web_search') {
        // Track web search usage for cost calculation
        webSearchRequests++;
      }
    }

    // Add citation information to the answer if present
    if (citations.length > 0) {
      answer += '\n\n**Sources:**\n';
      citations.forEach((citation, index) => {
        if (citation.type === 'web_search_result_location') {
          answer += `${index + 1}. [${citation.title}](${citation.url})\n`;
        }
      });
    }

    const answerTokens = enc.encode(answer).length;

    // Calculate cost including prompt caching and web search charges
    let costUSD = 0;

    // Extract usage information from response
    const usage = res.usage;
    const inputTokens = usage?.input_tokens || promptTokens;
    const outputTokens = usage?.output_tokens || answerTokens;
    const cacheCreationTokens = usage?.cache_creation_input_tokens || 0;
    const cacheReadTokens = usage?.cache_read_input_tokens || 0;

    // Calculate costs based on token types
    if (cacheCreationTokens > 0) {
      // Cache write cost depends on TTL
      const cacheWritePrice = cacheTTL === '1h' ? pricing.cacheWrite1h : pricing.cacheWrite5m;
      costUSD += (cacheCreationTokens / 1000) * (cacheWritePrice / 1000);
    }

    if (cacheReadTokens > 0) {
      // Cache read cost (much cheaper)
      costUSD += (cacheReadTokens / 1000) * (pricing.cacheRead / 1000);
    }

    // Regular input tokens (excluding cached tokens)
    const regularInputTokens = inputTokens - cacheCreationTokens - cacheReadTokens;
    if (regularInputTokens > 0) {
      costUSD += (regularInputTokens / 1000) * (pricing.input / 1000);
    }

    // Output tokens
    costUSD += (outputTokens / 1000) * (pricing.output / 1000);

    // Add web search cost if applicable
    if (webSearchRequests > 0) {
      costUSD += (webSearchRequests / 1000) * 10; // $10 per 1,000 web search requests
    }

    // Log caching statistics for debugging
    if (cacheCreationTokens > 0 || cacheReadTokens > 0) {
      console.log(`[Anthropic] Prompt caching stats:`, {
        cacheCreationTokens,
        cacheReadTokens,
        regularInputTokens,
        cacheSavings:
          cacheReadTokens > 0
            ? `${((1 - pricing.cacheRead / pricing.input) * 100).toFixed(1)}%`
            : '0%',
      });
    }

    return {
      answer,
      promptTokens: inputTokens,
      answerTokens: outputTokens,
      costUSD,
      // Include cache information for enhanced processing
      cacheCreationTokens,
      cacheReadTokens,
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
