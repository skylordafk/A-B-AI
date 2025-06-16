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
];

export const openaiProvider: BaseProvider = {
  id: 'openai',
  label: 'OpenAI',

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

  async chat(userPrompt: string, modelId?: string): Promise<ChatResult> {
    // Convert single prompt to messages format and use the new method
    return this.chatWithHistory([{ role: 'user', content: userPrompt }], modelId);
  },

  async chatWithHistory(messages: ChatMessage[], modelId?: string): Promise<ChatResult> {
    const apiKey = (globalThis as any).getApiKey?.('openai');
    if (!apiKey) throw new Error('OpenAI API key missing');

    const openai = new OpenAI({ apiKey });

    // Determine which model to use
    let model = DEFAULT_MODEL;
    if (modelId) {
      // Extract just the model name if it includes provider prefix
      const modelName = modelId.includes('/') ? modelId.split('/')[1] : modelId;

      // Map to actual model IDs
      if (
        modelName === 'gpt-4.1' ||
        (modelName.includes('gpt-4.1') &&
          !modelName.includes('mini') &&
          !modelName.includes('nano'))
      ) {
        model = 'gpt-4.1';
      } else if (
        modelName === 'gpt-4.1-mini' ||
        (modelName.includes('gpt-4.1') && modelName.includes('mini'))
      ) {
        model = 'gpt-4.1-mini';
      } else if (
        modelName === 'gpt-4.1-nano' ||
        (modelName.includes('gpt-4.1') && modelName.includes('nano'))
      ) {
        model = 'gpt-4.1-nano';
      } else if (modelName === 'gpt-4o' && !modelName.includes('mini')) {
        model = 'gpt-4o';
      } else if (
        modelName === 'gpt-4o-mini' ||
        (modelName.includes('gpt-4o') && modelName.includes('mini'))
      ) {
        model = 'gpt-4o-mini';
      } else if (modelName === 'gpt-3.5-turbo' || modelName.includes('3.5')) {
        model = 'gpt-3.5-turbo';
      } else if (modelName === 'o3-2025-04-16' || modelName.includes('o3')) {
        model = 'o3-2025-04-16';
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
      encodingModel = 'gpt-4'; // Default fallback
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enc = encoding_for_model(encodingModel as any);

    // Count tokens for all messages
    const allMessageText = messages.map((m) => m.content).join('\n');
    const promptTokens = enc.encode(allMessageText).length;

    // Convert our messages to OpenAI format
    const openaiMessages = messages.map((msg) => ({
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
      // Build request payload
      const responsePayload: any = {
        model,
        tools: [{ type: 'web_search_preview' }],
        // The Responses API accepts either a string or a message array for `input`.
        // We pass the chat history as an array so the model has full context.
        input: openaiMessages,
      };

      // Get max output tokens setting (0 means no limit)
      const maxOutputTokens = (globalThis as any).getMaxOutputTokens?.() ?? 8192;

      // Respect the global max output tokens setting if provided (>0)
      if (maxOutputTokens > 0) {
        responsePayload.max_output_tokens = maxOutputTokens;
      }

      // Call the Responses API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await (openai as any).responses.create(responsePayload);

      // Extract answer text. The SDK exposes `output_text` for convenience.
      const answer =
        res.output_text ||
        (res.output && res.output.length && res.output.at(-1)?.content?.[0]?.text) ||
        '';

      const answerTokens = enc.encode(answer).length;

      // Calculate cost (web search calls currently billed per 1K searches – not token-based).
      // We ignore the extra web search surcharge here for simplicity and only bill tokens.
      const costUSD =
        (promptTokens / 1000) * (pricing.input / 1000) +
        (answerTokens / 1000) * (pricing.output / 1000);

      return { answer, promptTokens, answerTokens, costUSD };
    }

    // ----------------- Default Chat Completions path -----------------
    // Configure request based on model type
    const requestConfig: any = {
      model,
      messages: openaiMessages,
    };

    // Get max output tokens setting (0 means no limit)
    const maxOutputTokens = (globalThis as any).getMaxOutputTokens?.() ?? 8192;

    // Use max_completion_tokens for o3 models, max_tokens for others
    // Only set if maxOutputTokens > 0 (0 means no limit)
    if (maxOutputTokens > 0) {
      if (model === 'o3-2025-04-16') {
        requestConfig.max_completion_tokens = maxOutputTokens;
      } else {
        requestConfig.max_tokens = maxOutputTokens;
      }
    }

    const res = await openai.chat.completions.create(requestConfig);

    const answer = res.choices[0].message?.content || '';
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
