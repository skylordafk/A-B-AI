import OpenAI from 'openai';
import { encoding_for_model } from '@dqbd/tiktoken';
import { BaseProvider, ChatResult } from './base';
import { ModelMeta } from '../types/model';

const DEFAULT_MODEL = 'o3-2025-04-16';

// Model pricing map
const MODEL_PRICING = {
  'o3-2025-04-16': {
    input: 0.01, // $10 per 1M tokens
    output: 0.04, // $40 per 1M tokens
  },
  'gpt-4.1-mini': {
    input: 0.0000005, // $0.50 per 1M tokens
    output: 0.0000015, // $1.50 per 1M tokens
  },
};

export const openaiProvider: BaseProvider = {
  id: 'openai',
  label: 'OpenAI o3',

  listModels(): ModelMeta[] {
    return [
      {
        id: 'o3-2025-04-16',
        name: 'OpenAI o3',
        description: 'Reasoning model with advanced capabilities.',
        contextSize: 128_000,
        pricePrompt: 10, // $10 per 1K
        priceCompletion: 40, // $40 per 1K
      },
      {
        id: 'gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        description: 'Cost-effective, fast OpenAI model.',
        contextSize: 128_000,
        pricePrompt: 0.0005,
        priceCompletion: 0.0015,
      },
    ];
  },

  async chat(userPrompt: string, modelId?: string): Promise<ChatResult> {
    const apiKey = (globalThis as any).getApiKey?.('openai');
    if (!apiKey) throw new Error('OpenAI API key missing');

    const openai = new OpenAI({ apiKey });

    // Determine which model to use
    let model = DEFAULT_MODEL;
    if (modelId) {
      // Extract just the model name if it includes provider prefix
      const modelName = modelId.includes('/') ? modelId.split('/')[1] : modelId;

      // Map to actual model IDs
      if (modelName === 'gpt-4.1-mini' || modelName.includes('mini')) {
        model = 'gpt-4.1-mini';
      } else if (modelName === 'o3-2025-04-16' || modelName.includes('o3')) {
        model = 'o3-2025-04-16';
      }
    }

    // Get pricing for the selected model
    const pricing =
      MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING[DEFAULT_MODEL];

    // Note: o3 is a reasoning model - token encoding may differ from traditional models
    // Using gpt-4 encoding as approximation for now
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enc = encoding_for_model('gpt-4' as any);

    // count prompt tokens
    const promptTokens = enc.encode(userPrompt).length;

    const res = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: userPrompt }],
      // Note: o3 models use max_completion_tokens instead of max_tokens
      max_completion_tokens: 4096,
    });

    const answer = res.choices[0].message?.content || '';
    const answerTokens = enc.encode(answer).length;

    // Calculate cost based on the model's pricing
    const costUSD = (promptTokens / 1000) * pricing.input + (answerTokens / 1000) * pricing.output;

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
