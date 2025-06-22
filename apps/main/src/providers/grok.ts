import { BaseProvider, ChatResult, ChatMessage, ChatOptions } from './base';
import { ModelMeta } from '../types/model';
import { createXai } from '@ai-sdk/xai';
import { generateText } from 'ai';

/** Adapter for xAI Grok API (v3) */
export class GrokProvider implements BaseProvider {
  id = 'grok';
  label = 'Grok 3';

  getCapabilities() {
    return {
      supportsJsonMode: false,
      supportsBatchAPI: false, // Grok does not support batch API
      supportsStreaming: false,
      supportsPromptCaching: false,
      supportsExtendedThinking: false,
      supportsWebSearch: false,
    };
  }

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

  async chat(userPrompt: string, modelId?: string, options?: ChatOptions): Promise<ChatResult> {
    // Convert single prompt to messages format and use the new method
    return this.chatWithHistory([{ role: 'user', content: userPrompt }], modelId, options);
  }

  async chatWithHistory(
    messages: ChatMessage[],
    modelId?: string,
    options?: ChatOptions
  ): Promise<ChatResult> {
    const apiKey = (globalThis as any).getApiKey?.('grok');
    if (!apiKey) throw new Error('Grok API key missing');

    // Get pricing from options (passed from ModelService)
    const pricing = options?.pricing;
    if (!pricing) {
      throw new Error(`No pricing information provided for model: ${modelId}`);
    }

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

      // Use messages format instead of prompt to avoid conflicts
      const { text, usage } = await generateText({
        model,
        system: messages.find((m) => m.role === 'system')?.content,
        messages: messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        signal: options?.abortSignal,
      } as any);

      // Calculate cost using the dynamic pricing from ModelService
      const promptTokens = usage?.promptTokens || 0;
      const answerTokens = usage?.completionTokens || 0;
      const costUSD =
        (promptTokens / 1000) * (pricing.prompt / 1000) +
        (answerTokens / 1000) * (pricing.completion / 1000);

      return {
        answer: text,
        promptTokens,
        answerTokens,
        costUSD,
      };
    } catch (error: any) {
      console.error('Grok API error:', error);
      throw new Error(`Grok API error: ${error.message || 'Unknown error'}`);
    }
  }

  // Batch API implementation for Grok
  // Note: Grok does not currently support batch API
  async submitBatch(_jobs: any[]): Promise<string> {
    throw new Error(
      'Grok does not support batch API. Use regular chat API or OpenAI batch API instead.'
    );
  }

  async getBatchStatus(_batchId: string): Promise<any> {
    throw new Error(
      'Grok does not support batch API. Use regular chat API or OpenAI batch API instead.'
    );
  }

  async retrieveBatchResults(_batchId: string): Promise<any[]> {
    throw new Error(
      'Grok does not support batch API. Use regular chat API or OpenAI batch API instead.'
    );
  }
}

export const grokProvider = new GrokProvider();
