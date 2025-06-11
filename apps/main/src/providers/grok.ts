import { BaseProvider, ChatResult } from './base';
import { ModelMeta } from '../types/model';
import { createXai } from '@ai-sdk/xai';
import { generateText } from 'ai';

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

  async chat(userPrompt: string, modelId?: string): Promise<ChatResult> {
    const apiKey = (globalThis as any).getApiKey?.('grok');
    if (!apiKey) throw new Error('Grok API key missing');

    const xai = createXai({
      apiKey,
    });

    try {
      // Determine which model to use
      let modelName = 'grok-3-mini'; // Default to mini

      if (modelId) {
        // Extract just the model name if it includes provider prefix
        const requestedModel = modelId.includes('/') ? modelId.split('/')[1] : modelId;

        // Map to actual model names
        if (
          requestedModel === 'grok-3' ||
          (requestedModel.includes('grok-3') && !requestedModel.includes('mini'))
        ) {
          modelName = 'grok-3';
        } else if (requestedModel === 'grok-3-mini' || requestedModel.includes('mini')) {
          modelName = 'grok-3-mini';
        }
      }

      const model = xai(modelName);

      const { text, usage } = await generateText({
        model,
        prompt: userPrompt,
      });

      // Grok uses flat pricing, so we'll estimate based on message count
      // Actual pricing would need to be obtained from xAI
      const flatPricePerMessage = 0.01; // Example: $0.01 per message
      const costUSD = flatPricePerMessage;

      return {
        answer: text,
        promptTokens: usage?.promptTokens || 0,
        answerTokens: usage?.completionTokens || 0,
        costUSD,
      };
    } catch (error: any) {
      console.error('Grok API error:', error);
      throw new Error(`Grok API error: ${error.message || 'Unknown error'}`);
    }
  }
}

export const grokProvider = new GrokProvider();
