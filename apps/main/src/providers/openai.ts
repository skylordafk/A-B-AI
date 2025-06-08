import OpenAI from 'openai';
import { encoding_for_model } from '@dqbd/tiktoken';
import { BaseProvider, ChatResult } from './base';

const MODEL = 'o3-2025-04-16';
const PRICE_PER_1K_INPUT = 0.01; // USD per 1k input tokens ($10 per 1M)
const PRICE_PER_1K_OUTPUT = 0.04; // USD per 1k output tokens ($40 per 1M)

export const openaiProvider: BaseProvider = {
  id: 'openai',
  label: 'OpenAI o3',

  async chat(userPrompt: string): Promise<ChatResult> {
    const apiKey = (globalThis as any).getApiKey?.('openai');
    if (!apiKey) throw new Error('OpenAI API key missing');

    const openai = new OpenAI({ apiKey });

    // Note: o3 is a reasoning model - token encoding may differ from traditional models
    // Using gpt-4 encoding as approximation for now
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enc = encoding_for_model('gpt-4' as any);

    // count prompt tokens
    const promptTokens = enc.encode(userPrompt).length;

    const res = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: userPrompt }],
      // Note: o3 models use max_completion_tokens instead of max_tokens
      max_completion_tokens: 4096,
    });

    const answer = res.choices[0].message?.content || '';
    const answerTokens = enc.encode(answer).length;

    // Calculate cost based on separate input/output pricing
    const costUSD =
      (promptTokens / 1000) * PRICE_PER_1K_INPUT + (answerTokens / 1000) * PRICE_PER_1K_OUTPUT;

    return { answer, promptTokens, answerTokens, costUSD };
  },
};

// Keep the legacy function for backward compatibility if needed
export async function chatWithOpenAI(apiKey: string, userPrompt: string, model = 'gpt-4o-mini') {
  const openai = new OpenAI({ apiKey });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enc = encoding_for_model(model as any);
  // count prompt tokens
  const promptTokens = enc.encode(userPrompt).length;

  const res = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const answer = res.choices[0].message?.content || '';
  const answerTokens = enc.encode(answer).length;
  const totalTokens = promptTokens + answerTokens;
  // Using the original GPT-4o pricing for the legacy function
  const LEGACY_PRICE_PER_1K = 0.01;
  const costUSD = (totalTokens / 1000) * LEGACY_PRICE_PER_1K;

  return { answer, promptTokens, answerTokens, costUSD };
}
