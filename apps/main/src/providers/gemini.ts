import { BaseProvider, ChatResult, ChatMessage, ChatOptions } from './base';
import { ModelMeta } from '../types/model';
import { countTokens, calcCost, TokenUsage } from '../coreLLM';

/** Adapter for Google AI Gemini API */
export class GeminiProvider implements BaseProvider {
  id = 'gemini';
  label = 'Gemini 1.5 Pro';

  getCapabilities() {
    return {
      supportsJsonMode: true,
      supportsBatchAPI: false, // Gemini does not support batch API
      supportsStreaming: false,
      supportsPromptCaching: false,
      supportsExtendedThinking: true,
      supportsWebSearch: false,
    };
  }

  private readonly MODELS: ModelMeta[] = [
    {
      id: 'models/gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      description: "Google's most advanced reasoning model with 1M context.",
      contextSize: 1_000_000,
      pricePrompt: 0.00125,
      priceCompletion: 0.005,
    },
    {
      id: 'models/gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      description: 'Fast and efficient model for everyday tasks.',
      contextSize: 1_000_000,
      pricePrompt: 0.000075,
      priceCompletion: 0.0003,
    },
    {
      id: 'models/gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash Experimental',
      description: 'Experimental next-generation model (free during preview).',
      contextSize: 1_000_000,
      pricePrompt: 0.0,
      priceCompletion: 0.0,
    },
  ];

  // Model pricing map
  // Removed hardcoded MODEL_PRICING - now uses dynamic pricing from ModelService via ChatOptions

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
    const apiKey = (globalThis as any).getApiKey?.('gemini');
    if (!apiKey) throw new Error('Gemini API key missing');

    // Note: @google/genai appears to have different API than @google/generative-ai
    // Using simplified approach for now
    // Note: Using dynamic import for @google/genai compatibility
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey });

    try {
      // Get pricing from options (passed from ModelService)
      const pricing = options?.pricing;
      if (!pricing) {
        throw new Error(`No pricing information provided for model: ${modelId}`);
      }

      // Determine which model to use - Fixed mapping to match actual models
      let modelName = 'gemini-1.5-flash'; // Default to flash

      if (modelId) {
        // Extract just the model name if it includes provider prefix
        const requestedModel = modelId.includes('/') ? modelId.split('/').pop() : modelId;

        // Map our model IDs to actual Gemini API model names
        if (requestedModel?.includes('1.5-pro') || requestedModel?.includes('pro')) {
          modelName = 'gemini-1.5-pro';
        } else if (requestedModel?.includes('1.5-flash') || requestedModel?.includes('flash')) {
          modelName = 'gemini-1.5-flash';
        } else if (requestedModel?.includes('2.0-flash-exp') || requestedModel?.includes('2.0')) {
          modelName = 'gemini-2.0-flash-exp';
        }
      }

      // Convert conversation history to a single prompt for Gemini
      // Gemini API doesn't support full conversation history in the same way as OpenAI
      let conversationPrompt = messages
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      // Add JSON mode instruction if requested
      if (options?.jsonMode) {
        conversationPrompt += '\n\nPlease respond with valid JSON only.';
      }

      // Use the models API interface
      const response = await genAI.models.generateContent({
        model: modelName,
        contents: conversationPrompt,
        signal: options?.abortSignal,
      } as any);

      const answer = response.text || '';

      // Count tokens using centralized utility
      const allMessageText = messages.map((m) => m.content).join('\n');
      const promptTokens = await countTokens(allMessageText, 'gemini');
      const answerTokens = await countTokens(answer, 'gemini');

      // Calculate cost using centralized utility
      const tokens: TokenUsage = { promptTokens, completionTokens: answerTokens };
      const costUSD = calcCost(tokens, pricing);

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

  // Batch API implementation for Gemini
  // Note: Gemini does not currently support batch API
  async submitBatch(_jobs: any[]): Promise<string> {
    throw new Error(
      'Gemini does not support batch API. Use regular chat API or OpenAI batch API instead.'
    );
  }

  async getBatchStatus(_batchId: string): Promise<any> {
    throw new Error(
      'Gemini does not support batch API. Use regular chat API or OpenAI batch API instead.'
    );
  }

  async retrieveBatchResults(_batchId: string): Promise<any[]> {
    throw new Error(
      'Gemini does not support batch API. Use regular chat API or OpenAI batch API instead.'
    );
  }
}

export const geminiProvider = new GeminiProvider();
