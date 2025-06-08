import OpenAI from 'openai';
import { encoding_for_model } from '@dqbd/tiktoken';

const PRICE_PER_1K_TOKENS_USD = 0.01; // GPT-4o June 2025 input+output price

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
  const costUSD = (totalTokens / 1000) * PRICE_PER_1K_TOKENS_USD;

  return { answer, promptTokens, answerTokens, costUSD };
}
