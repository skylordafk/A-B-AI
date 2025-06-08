import { BaseProvider, ChatResult } from './base';
import { ModelMeta } from '../types/model';

/** Adapter for xAI Grok API (v3) */
export class GrokProvider implements BaseProvider {
  id = 'grok';
  label = 'Grok 3';

  private readonly MODELS: ModelMeta[] = [
    {
      id: 'grok-3',
      name: 'Grok 3',
      description: 'Latest high-end model from xAI.',
      contextSize: 128_000,
      pricePrompt: -1,
      priceCompletion: -1,
    },
    {
      id: 'grok-3-mini',
      name: 'Grok 3 Mini',
      description: 'Low-cost, high-speed Grok tier.',
      contextSize: 64_000,
      pricePrompt: -1,
      priceCompletion: -1,
    },
  ];

  listModels() {
    return this.MODELS;
  }

  async chat(_userPrompt: string): Promise<ChatResult> {
    // TODO implement sendMessage(opts) – follow other adapters
    throw new Error('Grok provider chat not implemented yet');
  }
}

export const grokProvider = new GrokProvider();
