import { BaseProvider, ChatResult, ChatMessage, ChatOptions } from './base';
import { ModelMeta } from '../types/model';

/** Adapter for Google AI Gemini API */
export class GeminiProvider implements BaseProvider {
  id = 'gemini';
  label = 'Gemini 2.5 Pro';

  getCapabilities() {
    return {
      supportsJsonMode: true,
      supportsBatchAPI: false,
      supportsStreaming: false,
      supportsPromptCaching: false,
      supportsExtendedThinking: true,
      supportsWebSearch: false,
    };
  }

  private readonly MODELS: ModelMeta[] = [
    {
      id: 'models/gemini-2.5-pro-thinking',
      name: 'Gemini 2.5 Pro-Thinking',
      description: 'Top-tier reasoning model.',
      contextSize: 1_000_000,
      pricePrompt: 0.00125,
      priceCompletion: 0.01,
    },
    {
      id: 'models/gemini-2.5-flash-preview',
      name: 'Gemini 2.5 Flash-Preview',
      description: 'Fast and efficient Gemini model.',
      contextSize: 1_000_000,
      pricePrompt: 0.00035,
      priceCompletion: 0.00175,
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

      // Determine which model to use
      let modelName = 'gemini-1.5-flash'; // Default to flash

      if (modelId) {
        // Extract just the model name if it includes provider prefix
        const requestedModel = modelId.includes('/') ? modelId.split('/')[1] : modelId;

        // Map our model IDs to actual Gemini API model names
        if (requestedModel.includes('pro-thinking') || requestedModel.includes('2.5-pro')) {
          modelName = 'gemini-1.5-pro'; // Use pro model for thinking requests
        } else if (
          requestedModel.includes('flash-preview') ||
          requestedModel.includes('2.5-flash')
        ) {
          modelName = 'gemini-1.5-flash'; // Use flash for preview requests
        } else if (requestedModel.includes('flash') || requestedModel.includes('1.5-flash')) {
          modelName = 'gemini-1.5-flash';
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

      // Estimate token counts (Gemini doesn't provide exact token counts in basic API)
      // Using rough approximation: 1 token ≈ 4 characters
      const allMessageText = messages.map((m) => m.content).join('\n');
      const promptTokens = Math.ceil(allMessageText.length / 4);
      const answerTokens = Math.ceil(answer.length / 4);

      // Calculate cost using the dynamic pricing from ModelService
      const costUSD =
        (promptTokens / 1000) * (pricing.prompt / 1000) +
        (answerTokens / 1000) * (pricing.completion / 1000);

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
