import { BaseProvider, ChatResult, ChatMessage, ChatOptions } from './base';
import { ModelMeta } from '../types/model';
import { countTokens, calcCost, TokenUsage } from '../coreLLM';
import { getModel, loadPricing } from '@shared/utils/loadPricing';
import { LLMModel } from '@shared/types/ModelPricing';

/** Adapter for Google AI Gemini API */
export class GeminiProvider implements BaseProvider {
  id = 'gemini';
  label = 'Gemini';

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

  // listModels now dynamically gets models from the canonical source
  listModels(): ModelMeta[] {
    const allModels = loadPricing();
    const geminiModels = allModels.filter((m: LLMModel) => m.provider === 'gemini');

    // Map to the format BaseProvider expects
    return geminiModels.map((m: LLMModel) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      contextSize: m.contextSize,
      pricePrompt: m.pricing.prompt,
      priceCompletion: m.pricing.completion,
    }));
  }

  // Model pricing map
  // Removed hardcoded MODEL_PRICING - now uses dynamic pricing from ModelService via ChatOptions

  async chat(userPrompt: string, modelId?: string, options?: ChatOptions): Promise<ChatResult> {
    // Convert single prompt to messages format and use the new method
    return this.chatWithHistory([{ role: 'user', content: userPrompt }], modelId, options);
  }

  async chatWithHistory(
    messages: ChatMessage[],
    modelId?: string,
    _options?: ChatOptions
  ): Promise<ChatResult> {
    const apiKey = (globalThis as any).getApiKey?.('gemini');
    if (!apiKey) throw new Error('Gemini API key missing');

    try {
      // Get pricing from the canonical model definition
      if (!modelId) {
        throw new Error('Model ID is required for Gemini chat');
      }
      const modelInfo = getModel(modelId);
      const pricing = modelInfo.pricing;

      // Determine which model to use - Fixed mapping to match actual models
      // Extract just the model name if it includes provider prefix
      const requestedModel = modelId.includes('/') ? modelId.split('/').pop() : modelId;

      // Map our model IDs to actual Gemini API model names.
      // The Gemini API expects names like 'gemini-2.5-pro' not the full 'models/gemini-2.5-pro-thinking'
      let modelName = 'gemini-2.5-flash'; // Default to flash
      if (requestedModel?.includes('2.5-pro-thinking')) {
        modelName = 'gemini-2.5-pro';
      } else if (requestedModel?.includes('2.5-flash-preview')) {
        modelName = 'gemini-2.5-flash';
      } else if (requestedModel?.includes('pro')) {
        modelName = 'gemini-2.5-pro';
      } else if (requestedModel?.includes('flash')) {
        modelName = 'gemini-2.5-flash';
      }

      // Note: @google/genai appears to have different API than @google/generative-ai
      // Using simplified approach for now
      // Note: Using dynamic import for @google/genai compatibility
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);

      // Convert conversation history to a single prompt for Gemini
      // Gemini API doesn't support full conversation history in the same way as OpenAI
      const model = genAI.getGenerativeModel({ model: modelName });
      const lastMessage = messages.pop();
      if (!lastMessage) {
        return { answer: '', promptTokens: 0, answerTokens: 0, costUSD: 0 };
      }

      const chat = model.startChat({
        history: messages.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          // No specific config needed for now
        },
      });

      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;
      const answer = response.text();

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
