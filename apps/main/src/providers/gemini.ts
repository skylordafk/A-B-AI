import { BaseProvider, ChatResult, ChatMessage } from './base';
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
  private readonly MODEL_PRICING: Record<string, { pricePerKTokens: number }> = {
    'gemini-1.5-pro': { pricePerKTokens: 0.00125 }, // Pro model pricing (using lower tier)
    'gemini-1.5-flash': { pricePerKTokens: 0.00035 }, // Flash model pricing
    'gemini-2.5-flash-preview': { pricePerKTokens: 0.00035 }, // New flash preview model
  };

  listModels() {
    return this.MODELS;
  }

  async chat(
    userPrompt: string,
    modelId?: string,
    options?: { abortSignal?: AbortSignal }
  ): Promise<ChatResult> {
    // Convert single prompt to messages format and use the new method
    return this.chatWithHistory([{ role: 'user', content: userPrompt }], modelId, options);
  }

  async chatWithHistory(
    messages: ChatMessage[],
    modelId?: string,
    options?: { abortSignal?: AbortSignal }
  ): Promise<ChatResult> {
    const apiKey = (globalThis as any).getApiKey?.('gemini');
    if (!apiKey) throw new Error('Gemini API key missing');

    // Note: @google/genai appears to have different API than @google/generative-ai
    // Using simplified approach for now
    // Note: Using dynamic import for @google/genai compatibility
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey });

    try {
      // Determine which model to use
      let modelName = 'gemini-1.5-flash'; // Default to flash
      let pricing = this.MODEL_PRICING['gemini-2.5-flash-preview'];

      if (modelId) {
        // Extract just the model name if it includes provider prefix
        const requestedModel = modelId.includes('/') ? modelId.split('/')[1] : modelId;

        // Map our model IDs to actual Gemini API model names
        if (requestedModel.includes('pro-thinking') || requestedModel.includes('2.5-pro')) {
          modelName = 'gemini-1.5-pro'; // Use pro model for thinking requests
          pricing = this.MODEL_PRICING['gemini-1.5-pro'];
        } else if (
          requestedModel.includes('flash-preview') ||
          requestedModel.includes('2.5-flash')
        ) {
          modelName = 'gemini-1.5-flash'; // Use flash for preview requests
          pricing = this.MODEL_PRICING['gemini-2.5-flash-preview'];
        } else if (requestedModel.includes('flash') || requestedModel.includes('1.5-flash')) {
          modelName = 'gemini-1.5-flash';
          pricing = this.MODEL_PRICING['gemini-1.5-flash'];
        }
      }

      // Convert conversation history to a single prompt for Gemini
      // Gemini API doesn't support full conversation history in the same way as OpenAI
      const conversationPrompt = messages
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

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

      // Calculate cost based on the selected model's pricing
      const costUSD = ((promptTokens + answerTokens) / 1000) * pricing.pricePerKTokens;

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
