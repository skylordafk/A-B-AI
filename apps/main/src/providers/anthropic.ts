import Anthropic from '@anthropic-ai/sdk';
import { encoding_for_model } from '@dqbd/tiktoken';
import { BaseProvider, ChatResult } from './base';
import { ModelMeta } from '../types/model';

const MODEL = 'claude-opus-4-20250514';
const PRICE_PER_1K_INPUT = 0.015; // USD per 1k input tokens ($15 per 1M)
const PRICE_PER_1K_OUTPUT = 0.075; // USD per 1k output tokens ($75 per 1M)

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

  async chat(userPrompt: string): Promise<ChatResult> {
    const apiKey = (globalThis as any).getApiKey?.('anthropic');
    if (!apiKey) throw new Error('Anthropic API key missing');

    const anthropic = new Anthropic({ apiKey });

    // Use gpt-4 encoding as approximation for Claude
    // Note: Claude Opus 4 is a reasoning model with potentially different token calculation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enc = encoding_for_model('gpt-4' as any);
    const promptTokens = enc.encode(userPrompt).length;

    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096, // Increased for reasoning model outputs
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Extract text content from response
    const answer = res.content[0].type === 'text' ? res.content[0].text : '';
    const answerTokens = enc.encode(answer).length;

    // Calculate cost based on input/output pricing
    const costUSD =
      (promptTokens / 1000) * PRICE_PER_1K_INPUT + (answerTokens / 1000) * PRICE_PER_1K_OUTPUT;

    return { answer, promptTokens, answerTokens, costUSD };
  },
};
