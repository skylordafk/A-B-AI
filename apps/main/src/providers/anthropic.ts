import Anthropic from '@anthropic-ai/sdk';
import { encoding_for_model } from '@dqbd/tiktoken';
import { BaseProvider, ChatResult } from './base';
import { ModelMeta } from '../types/model';

const DEFAULT_MODEL = 'claude-opus-4-20250514';

// Model pricing map
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-20250514': {
    input: 0.015, // $15 per 1M tokens
    output: 0.075, // $75 per 1M tokens
  },
  'claude-3-haiku': {
    input: 0.00025, // $0.25 per 1M tokens
    output: 0.00025, // $0.25 per 1M tokens
  },
  'claude-3-haiku-20240307': {
    input: 0.00025,
    output: 0.00025,
  },
};

export const anthropicProvider: BaseProvider = {
  id: 'anthropic',
  label: 'Claude Opus 4',

  listModels(): ModelMeta[] {
    return [
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        description: 'Advanced reasoning model from Anthropic.',
        contextSize: 200_000,
        pricePrompt: 15, // $15 per 1K
        priceCompletion: 75, // $75 per 1K
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fast/cheap Anthropic tier.',
        contextSize: 200_000,
        pricePrompt: 0.00025,
        priceCompletion: 0.00025,
      },
    ];
  },

  async chat(userPrompt: string, modelId?: string): Promise<ChatResult> {
    const apiKey = (globalThis as any).getApiKey?.('anthropic');
    if (!apiKey) throw new Error('Anthropic API key missing');

    const anthropic = new Anthropic({ apiKey });

    // Determine which model to use
    let model = DEFAULT_MODEL;
    if (modelId) {
      // Extract just the model name if it includes provider prefix
      const modelName = modelId.includes('/') ? modelId.split('/')[1] : modelId;

      // Map common model names to actual API model IDs
      if (modelName === 'claude-3-haiku' || modelName.includes('haiku')) {
        model = 'claude-3-haiku-20240307'; // Actual API model ID
      } else if (modelName === 'claude-opus-4-20250514' || modelName.includes('opus')) {
        model = 'claude-opus-4-20250514';
      }
    }

    // Get pricing for the selected model
    const pricing = MODEL_PRICING[model] || MODEL_PRICING[DEFAULT_MODEL];

    // Use gpt-4 encoding as approximation for Claude
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enc = encoding_for_model('gpt-4' as any);
    const promptTokens = enc.encode(userPrompt).length;

    const res = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Extract text content from response
    const answer = res.content[0].type === 'text' ? res.content[0].text : '';
    const answerTokens = enc.encode(answer).length;

    // Calculate cost based on the model's pricing
    const costUSD = (promptTokens / 1000) * pricing.input + (answerTokens / 1000) * pricing.output;

    return { answer, promptTokens, answerTokens, costUSD };
  },
};
