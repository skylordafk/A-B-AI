import type { BatchRow, BatchResult } from '../../types/batch';
import { calculateActualCost } from './estimateCost';
import { substituteTemplateVars } from './parseInput';

// Import providers - we'll use window.electron to access them

interface ModelResponse {
  answer: string;
  promptTokens: number;
  answerTokens: number;
  costUSD: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  cost: number;
}

interface ExtendedModelResponse extends ModelResponse {
  usage: ModelResponse['usage'] & {
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  provider: string;
  model: string;
}

export async function runRow(
  row: BatchRow,
  options?: {
    enablePromptCaching?: boolean;
    cacheTTL?: '5m' | '1h';
    cacheSystemPrompt?: boolean;
  }
): Promise<BatchResult> {
  const startTime = Date.now();
  const model = row.model || 'openai/gpt-4o';

  try {
    // Substitute template variables in the prompt
    const { output: processedPrompt, missing } = substituteTemplateVars(row.prompt, row.data || {});
    if (missing.length) {
      return {
        id: row.id,
        prompt: row.prompt,
        model,
        status: 'error',
        error: `Missing values for: ${missing.join(', ')}`,
        errorMessage: `Missing values for: ${missing.join(', ')}`,
        latency_ms: Date.now() - startTime,
        data: row.data,
      };
    }

    // Check if API key exists for the provider
    const apiKeys = await (window as any).api.getAllKeys();
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
        data: row.data,
      };
    }

    let response: ModelResponse | ExtendedModelResponse;

    // For Claude models, use enhanced features if available
    if (
      provider === 'anthropic' &&
      options?.enablePromptCaching &&
      (window as any).api.sendToModelWithFeatures
    ) {
      // Use the enhanced method with caching options
      response = await (window as any).api.sendToModelWithFeatures(model, processedPrompt, {
        systemPrompt: row.system,
        temperature: row.temperature,
        enablePromptCaching: options.enablePromptCaching,
        cacheTTL: options.cacheTTL || '5m',
        cacheSystemPrompt: options.cacheSystemPrompt || true,
      });
    } else {
      // Send message using the standard model handler
      response = await (window as any).api.sendToModel(model, processedPrompt, row.system, row.temperature);
    }

    // Get token counts
    const tokensIn = response.usage?.prompt_tokens || response.promptTokens || 0;
    const tokensOut = response.usage?.completion_tokens || response.answerTokens || 0;

    // Calculate actual cost based on the pricing data
    const actualCost = await calculateActualCost(row, tokensIn, tokensOut);

    // Check for caching information in response
    let cachingInfo = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const usage = response.usage as ExtendedModelResponse['usage']; // Use the extended usage type
    if (usage?.cache_creation_input_tokens || usage?.cache_read_input_tokens) {
      const cacheCreated = usage.cache_creation_input_tokens || 0;
      const cacheRead = usage.cache_read_input_tokens || 0;

      if (cacheCreated > 0) {
        cachingInfo += ` [Cache: Created ${cacheCreated} tokens]`;
      }
      if (cacheRead > 0) {
        const savings = Math.round((1 - 0.1) * 100); // 90% savings on cache hits
        cachingInfo += ` [Cache: Read ${cacheRead} tokens, ${savings}% savings]`;
      }
    }

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
      data: row.data,
      cachingInfo, // Add caching information for display
    };
  } catch (error: unknown) {
    console.error('Error processing row:', error);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Check if it's an API error
    const isApiError =
      errorMessage.includes('API') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota') ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (typeof error === 'object' && error !== null && 'status' in error && (error as any).status >= 400); // More robust status check

    return {
      id: row.id,
      prompt: row.prompt,
      model,
      status: isApiError ? 'error-api' : 'error',
      error: errorMessage,
      errorMessage: errorMessage,
      latency_ms: Date.now() - startTime,
      data: row.data, // Preserve original CSV data
    };
  }
}

// Optional afterEach hook for future extensibility
export const afterEach: (result: BatchResult) => void = () => {
  // NO-OP by default
};
