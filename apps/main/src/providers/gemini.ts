import { BaseProvider, ChatResult } from './base';
import { ModelMeta } from '../types/model';

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

  async chat(_userPrompt: string): Promise<ChatResult> {
    // TODO implement sendMessage(opts) incl. streaming & safety
    throw new Error('Gemini provider chat not implemented yet');
  }
}

export const geminiProvider = new GeminiProvider();
