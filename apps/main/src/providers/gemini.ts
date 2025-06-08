import { BaseProvider, ChatResult } from './base';
import { ModelMeta } from '../types/model';
import { GoogleGenAI } from '@google/genai';

/** Adapter for Google AI Gemini API */
export class GeminiProvider implements BaseProvider {
  id = 'gemini';
  label = 'Gemini 2.5 Pro';

  private readonly MODELS: ModelMeta[] = [
    {
      id: 'models/gemini-2.5-pro-thinking',
      name: 'Gemini 2.5 Pro-Thinking',
      description: 'Top-tier reasoning model.',
      contextSize: 1_000_000,
      pricePrompt: 0.0008,
      priceCompletion: 0.0008,
    },
    {
      id: 'models/gemini-1.5-flash-fast',
      name: 'Gemini 1.5 Flash-Fast',
      description: 'Low-cost, high-speed Gemini.',
      contextSize: 1_000_000,
      pricePrompt: 0.00035,
      priceCompletion: 0.00035,
    },
  ];

  listModels() {
    return this.MODELS;
  }

  async chat(userPrompt: string): Promise<ChatResult> {
    const apiKey = (globalThis as any).getApiKey?.('gemini');
    if (!apiKey) throw new Error('Gemini API key missing');

    const genAI = new GoogleGenAI({ apiKey });

    try {
      // Use gemini-1.5-flash-fast as default model (fast tier)
      const modelName = 'gemini-1.5-flash';
      const model = genAI.models;

      const response = await model.generateContent({
        model: modelName,
        contents: userPrompt,
      });

      const answer = response.text || '';

      // Estimate token counts (Gemini doesn't provide exact token counts in basic API)
      // Using rough approximation: 1 token ≈ 4 characters
      const promptTokens = Math.ceil(userPrompt.length / 4);
      const answerTokens = Math.ceil(answer.length / 4);

      // Use the fast tier pricing
      const pricePerKTokens = 0.00035;
      const costUSD = ((promptTokens + answerTokens) / 1000) * pricePerKTokens;

      return {
        answer,
        promptTokens,
        answerTokens,
        costUSD,
      };
    } catch (error: any) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API error: ${error.message || 'Unknown error'}`);
    }
  }
}

export const geminiProvider = new GeminiProvider();
