import type { BatchRow, BatchResult } from '../../types/batch';
import { calculateActualCost } from './estimateCost';

// Import providers - we'll use window.electron to access them
declare global {
  interface Window {
    electron: {
      sendMessage: (
        model: string,
        prompt: string,
        systemPrompt?: string,
        temperature?: number
      ) => Promise<any>;
      getModels: () => Promise<string[]>;
      getApiKeys: () => Promise<Record<string, string>>;
    };
  }
}

export async function runRow(row: BatchRow): Promise<BatchResult> {
  const startTime = Date.now();
  const model = row.model || 'openai/o3-2025-04-16';

  try {
    // Check if API key exists for the provider
    const apiKeys = await window.api.getAllKeys();
    const provider = model.split('/')[0] || 'openai';

    if (!apiKeys[provider as keyof typeof apiKeys]) {
      return {
        id: row.id,
        prompt: row.prompt,
        model,
        status: 'error-missing-key',
        error: `Missing API key for provider: ${provider}`,
        errorMessage: `Missing API key for provider: ${provider}`,
        latency_ms: Date.now() - startTime,
      };
    }

    // Send message using the model-specific handler
    const response = await window.api.sendToModel(model, row.prompt, row.system, row.temperature);

    // Get token counts
    const tokensIn = response.usage?.prompt_tokens || response.promptTokens || 0;
    const tokensOut = response.usage?.completion_tokens || response.answerTokens || 0;

    // Calculate actual cost based on the pricing data
    const actualCost = await calculateActualCost(row, tokensIn, tokensOut);

    return {
      id: row.id,
      prompt: row.prompt,
      model,
      status: 'success',
      response: response.answer || '',
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: actualCost,
      latency_ms: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('Error processing row:', error);

    // Check if it's an API error
    const isApiError =
      error.message?.includes('API') ||
      error.message?.includes('rate limit') ||
      error.message?.includes('quota') ||
      error.status >= 400;

    return {
      id: row.id,
      prompt: row.prompt,
      model,
      status: isApiError ? 'error-api' : 'error',
      error: error.message || 'Unknown error',
      errorMessage: error.message || 'Unknown error',
      latency_ms: Date.now() - startTime,
    };
  }
}

// Optional afterEach hook for future extensibility
export const afterEach: (result: BatchResult) => void = () => {
  // NO-OP by default
};
