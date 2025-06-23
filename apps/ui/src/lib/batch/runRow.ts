/// <reference types="vitest/globals" />

import type { BatchRow, BatchResult } from '../../types/batch';
import { calculateActualCost } from './estimateCost';
import { substituteTemplateVars } from './parseInput';
import { ChatOptions } from '@main/providers/base';
import { parseModelId } from '@shared/utils/model';
import type { LLMModel } from '@shared/types/ModelPricing';

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

interface _ExtendedModelResponse extends ModelResponse {
  usage: ModelResponse['usage'] & {
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  provider: string;
  model: string;
}

// Mock the pricing data loading for tests
if (import.meta.vitest) {
  vi.mock('../../shared/utils/loadPricing', () => ({
    loadPricing: vi.fn(() => []), // Return empty array for model lookups
    getModel: vi.fn(),
  }));
}

/**
 * Runs a single row and returns the result.
 */
export async function runRow(
  row: BatchRow,
  allModels: LLMModel[],
  options: {
    enablePromptCaching?: boolean;
    cacheTTL?: '5m' | '1h';
    cacheSystemPrompt?: boolean;
  }
): Promise<BatchResult> {
  const startTime = Date.now();
  const { id, prompt, model, system, temperature, data } = row;

  if (!model) {
    return {
      id,
      prompt,
      model: 'unknown',
      status: 'error',
      error: 'Model not specified',
      latency_ms: 0,
    };
  }

  try {
    // Check if API key is configured for the model's provider
    const { provider } = parseModelId(model);
    const apiKeysResponse = await window.api.request({
      type: 'settings:load',
      payload: { key: 'allKeys' },
    });
    const apiKeys = apiKeysResponse.data || {};

    if (!apiKeys[provider]?.configured) {
      return {
        id,
        prompt,
        model,
        status: 'error-missing-key',
        error: `Missing API key for provider: ${provider}`,
        errorMessage: `Missing API key for provider: ${provider}. Please configure API keys in Settings.`,
        latency_ms: Date.now() - startTime,
        data: row.data,
      };
    }

    // Substitute template variables in the prompt
    const { output: processedPrompt, missing } = substituteTemplateVars(prompt, row.data || {});
    if (missing.length) {
      return {
        id,
        prompt,
        model,
        status: 'error',
        error: `Missing template variables: ${missing.join(', ')}`,
        errorMessage: `The following template variables were not found in the row data: ${missing.join(', ')}`,
        latency_ms: Date.now() - startTime,
        data: row.data,
      };
    }

    const chatOptions: ChatOptions = {
      systemPrompt: system,
      temperature,
      enablePromptCaching: options.enablePromptCaching,
      cacheTTL: options.cacheTTL,
      jsonMode: data?.jsonMode,
      jsonSchema: data?.jsonSchema ? JSON.parse(data.jsonSchema) : undefined,
    };

    const response = await window.api.request({
      type: 'chat:send',
      payload: {
        modelId: model,
        content: processedPrompt,
        options: chatOptions,
      },
    });

    if (response.error) {
      throw new Error(response.error);
    }
    const resultData = response.data;

    const modelDef = allModels.find((m) => m.id === model || `${m.provider}/${m.id}` === model);

    if (!modelDef) {
      throw new Error(`Could not find a definition for model: ${model}`);
    }

    const cost = await calculateActualCost(
      row,
      resultData.promptTokens,
      resultData.answerTokens,
      allModels
    );

    return {
      id,
      prompt,
      model,
      status: 'success',
      response: resultData.answer,
      tokens_in: resultData.promptTokens,
      tokens_out: resultData.answerTokens,
      cost_usd: cost,
      latency_ms: Date.now() - startTime,
      data: row.data,
    };
  } catch (error: any) {
    const isApiError = error.message?.includes('API');
    return {
      id,
      prompt,
      model,
      status: isApiError ? 'error-api' : 'error',
      error: error.message || 'An unknown error occurred',
      errorMessage: error.message || 'An unknown error occurred',
      latency_ms: Date.now() - startTime,
      data: row.data,
    };
  }
}

// Optional afterEach hook for future extensibility
export const afterEach: (result: BatchResult) => void = () => {
  // NO-OP by default
};
