import OpenAI from 'openai';
import { encoding_for_model } from '@dqbd/tiktoken';
import { BaseProvider, ChatResult, ChatMessage } from './base';
import { ModelMeta } from '../types/model';

const DEFAULT_MODEL = 'gpt-4o';

// Model pricing map (per 1M tokens)
const MODEL_PRICING = {
  'gpt-4.1': {
    input: 2.0, // $2.00 per 1M tokens
    output: 8.0, // $8.00 per 1M tokens
  },
  'gpt-4.1-mini': {
    input: 0.4, // $0.40 per 1M tokens
    output: 1.6, // $1.60 per 1M tokens
  },
  'gpt-4.1-nano': {
    input: 0.1, // $0.10 per 1M tokens
    output: 0.4, // $0.40 per 1M tokens
  },
  'gpt-4o': {
    input: 2.5, // $2.50 per 1M tokens
    output: 5.0, // $5.00 per 1M tokens
  },
  'gpt-4o-mini': {
    input: 0.6, // $0.60 per 1M tokens
    output: 2.4, // $2.40 per 1M tokens
  },
  'gpt-3.5-turbo': {
    input: 0.5, // $0.50 per 1M tokens
    output: 1.5, // $1.50 per 1M tokens
  },
  // New o-series reasoning model (canonical id)
  o3: {
    input: 2.0, // $2.00 per 1M tokens
    output: 8.0, // $8.00 per 1M tokens
  },
  // Legacy model (keeping for backward compatibility)
  'o3-2025-04-16': {
    input: 10.0, // $10.00 per 1M tokens
    output: 40.0, // $40.00 per 1M tokens
  },
};

// Add list of models that support the new web_search tool (preview)
const WEB_SEARCH_SUPPORTED_MODELS = [
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
  'gpt-4o-mini',
  'o3',
];

/**
 * Normalize a requested model id to an actual model alias used in API calls.
 * Any id that starts with "o" (e.g. "o1", "o3-mini") is mapped to the
 * canonical "o3" family by default unless it already references a
 * known o-series variant like "o4-mini".
 */
function normalizeModel(id?: string): string {
  if (!id) return DEFAULT_MODEL;

  // If provider prefix present (e.g. "openai/o3") take the part after slash
  const modelName = id.includes('/') ? id.split('/')[1] : id;

  // Explicit handling for legacy names we keep
  if (modelName === 'o3-2025-04-16') return 'o3-2025-04-16';

  // Any id starting with the letter "o" is considered an o-series model.
  if (/^o\d/.test(modelName)) {
    // At the moment we only officially support o3. Additional variants like
    // "o4-mini" can map to themselves if needed.
    return modelName;
  }

  // Otherwise use existing mapping logic
  if (
    modelName.startsWith('gpt-4.1') &&
    !modelName.includes('mini') &&
    !modelName.includes('nano')
  ) {
    return 'gpt-4.1';
  }
  if (modelName.startsWith('gpt-4.1') && modelName.includes('mini')) {
    return 'gpt-4.1-mini';
  }
  if (modelName.startsWith('gpt-4.1') && modelName.includes('nano')) {
    return 'gpt-4.1-nano';
  }
  if (modelName === 'gpt-4o' || (modelName.startsWith('gpt-4o') && !modelName.includes('mini'))) {
    return 'gpt-4o';
  }
  if (modelName.startsWith('gpt-4o') && modelName.includes('mini')) {
    return 'gpt-4o-mini';
  }
  if (modelName.startsWith('gpt-3.5')) {
    return 'gpt-3.5-turbo';
  }

  return DEFAULT_MODEL;
}

/**
 * Build parameter object for OpenAI chat / responses API calls.
 * Automatically handles o-series differences (max_completion_tokens / reasoning_effort).
 */
function buildParams(
  model: string,
  maxOut: number,
  extra: Record<string, any> = {}
): Record<string, any> {
  const isO = model.startsWith('o');
  const base: Record<string, any> = { model };

  if (maxOut > 0) {
    if (isO) {
      base.max_completion_tokens = maxOut;
    } else {
      base.max_tokens = maxOut;
    }
  }

  if (isO) {
    base.reasoning_effort = (globalThis as any).getReasoningEffort?.() ?? 'high';
  }

  return {
    ...base,
    ...extra,
  };
}

export const openaiProvider: BaseProvider = {
  id: 'openai',
  label: 'OpenAI',

  getCapabilities() {
    return {
      supportsJsonMode: true,
      supportsBatchAPI: true,
      supportsStreaming: true,
      supportsPromptCaching: false,
      supportsExtendedThinking: false,
      supportsWebSearch: true,
    };
  },

  listModels(): ModelMeta[] {
    return [
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        description: 'Most capable GPT-4.1 model with enhanced coding abilities and 1M context.',
        contextSize: 1_000_000,
        pricePrompt: 2.0,
        priceCompletion: 8.0,
      },
      {
        id: 'gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        description: 'Balanced performance and cost with 1M context window.',
        contextSize: 1_000_000,
        pricePrompt: 0.4,
        priceCompletion: 1.6,
      },
      {
        id: 'gpt-4.1-nano',
        name: 'GPT-4.1 Nano',
        description: 'Fastest and most cost-effective model for simple tasks.',
        contextSize: 1_000_000,
        pricePrompt: 0.1,
        priceCompletion: 0.4,
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Multimodal flagship model with vision and audio capabilities.',
        contextSize: 128_000,
        pricePrompt: 2.5,
        priceCompletion: 5.0,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Affordable multimodal model, great for most tasks.',
        contextSize: 128_000,
        pricePrompt: 0.6,
        priceCompletion: 2.4,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and economical model for simpler tasks.',
        contextSize: 16_000,
        pricePrompt: 0.5,
        priceCompletion: 1.5,
      },
      // Legacy model (keeping for backward compatibility)
      {
        id: 'o3-2025-04-16',
        name: 'OpenAI o3 (Legacy)',
        description: 'Legacy reasoning model - consider using GPT-4.1 instead.',
        contextSize: 128_000,
        pricePrompt: 10.0,
        priceCompletion: 40.0,
      },
    ];
  },

  async chat(
    userPrompt: string,
    modelId?: string,
    options?: { abortSignal?: AbortSignal }
  ): Promise<ChatResult> {
    // Convert single prompt to messages format and use the new method
    return this.chatWithHistory([{ role: 'user', content: userPrompt }], modelId, options);
  },

  async chatWithHistory(
    messages: ChatMessage[],
    modelId?: string,
    options?: { abortSignal?: AbortSignal }
  ): Promise<ChatResult> {
    const apiKey = (globalThis as any).getApiKey?.('openai');
    if (!apiKey) throw new Error('OpenAI API key missing');

    const openai = new OpenAI({ apiKey });

    // Canonicalize the requested model id
    const model = normalizeModel(modelId);

    const isO = model.startsWith('o');

    // ------------------------------------------------------------
    // Merge developer role into the first system message for o-series
    // ------------------------------------------------------------
    const preparedMessages: ChatMessage[] = [...messages];
    if (isO) {
      const devIdx = preparedMessages.findIndex((m) => m.role === 'developer');
      if (devIdx !== -1) {
        const devContent = preparedMessages[devIdx].content;
        // Remove the developer entry
        preparedMessages.splice(devIdx, 1);

        const sysIdx = preparedMessages.findIndex((m) => m.role === 'system');
        if (sysIdx !== -1) {
          // Append developer content to existing system message
          preparedMessages[sysIdx] = {
            ...preparedMessages[sysIdx],
            content: `${preparedMessages[sysIdx].content}\n${devContent}`,
          };
        } else {
          // Prepend new system message
          preparedMessages.unshift({ role: 'system', content: devContent });
        }
      }
    }

    // Get pricing for the selected model
    const pricing =
      MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING[DEFAULT_MODEL];

    // Use appropriate encoding based on model
    let encodingModel: string;
    if (model.includes('gpt-4')) {
      encodingModel = 'gpt-4';
    } else if (model.includes('gpt-3.5')) {
      encodingModel = 'gpt-3.5-turbo';
    } else {
      encodingModel = 'gpt-4';
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enc = encoding_for_model(encodingModel as any);

    // Count tokens for all messages
    const allMessageText = preparedMessages.map((m) => m.content).join('\n');
    const promptTokens = enc.encode(allMessageText).length;

    // Convert our messages to OpenAI format
    const openaiMessages = preparedMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // ---------------------------------------------
    // Decide whether to use the new Responses API
    // ---------------------------------------------
    const enableWebSearch = (globalThis as any).getEnableWebSearch?.() ?? false;
    const useWebSearch = enableWebSearch && WEB_SEARCH_SUPPORTED_MODELS.includes(model);

    if (useWebSearch) {
      // ----------------- Responses API path (with web_search tool) -----------------
      const maxOutputTokens = (globalThis as any).getMaxOutputTokens?.() ?? 8192;

      const responsePayload: any = {
        model,
        tools: [{ type: 'web_search_preview' }],
        input: openaiMessages,
        reasoning_effort: 'high',
      };

      if (maxOutputTokens > 0) {
        responsePayload.max_output_tokens = maxOutputTokens;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await (openai as any).responses.create(responsePayload);

      const answer =
        res.output_text ||
        (res.output && res.output.length && res.output.at(-1)?.content?.[0]?.text) ||
        '';

      const answerTokens = enc.encode(answer).length;

      const costUSD =
        (promptTokens / 1000) * (pricing.input / 1000) +
        (answerTokens / 1000) * (pricing.output / 1000);

      return { answer, promptTokens, answerTokens, costUSD };
    }

    // ----------------- Chat Completions path -----------------
    const maxOutputTokens = (globalThis as any).getMaxOutputTokens?.() ?? 8192;

    let requestConfig = buildParams(model, maxOutputTokens, {
      messages: openaiMessages,
      response_format: (globalThis as any).getJsonMode?.() ? { type: 'json_object' } : undefined,
    });

    // Clean out undefined values to avoid API errors
    requestConfig = Object.fromEntries(
      Object.entries(requestConfig).filter(([, v]) => v !== undefined)
    );

    // Cast to any to satisfy the SDK typings which may lag behind new params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (openai.chat.completions as any).create(requestConfig, {
      signal: options?.abortSignal,
    });

    const answer = res.choices?.[0]?.message?.content || '';
    const answerTokens = enc.encode(answer).length;

    // Calculate cost based on the model's pricing (convert from per-1M to per-1K)
    const costUSD =
      (promptTokens / 1000) * (pricing.input / 1000) +
      (answerTokens / 1000) * (pricing.output / 1000);

    return { answer, promptTokens, answerTokens, costUSD };
  },
};

// Legacy function for backward compatibility
export async function chatWithOpenAI(apiKey: string, userPrompt: string): Promise<ChatResult> {
  const oldGetApiKey = (globalThis as any).getApiKey;
  (globalThis as any).getApiKey = () => apiKey;
  try {
    return await openaiProvider.chat(userPrompt);
  } finally {
    (globalThis as any).getApiKey = oldGetApiKey;
  }
}
