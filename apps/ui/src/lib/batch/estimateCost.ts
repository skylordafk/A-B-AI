import type { BatchRow, CostEstimation } from '@ui/types/batch';
import { getModel } from '@shared/utils/loadPricing';
import { Pricing } from '@shared/types/ModelPricing';
import { LLMModel } from '@shared/types/ModelPricing';

// Estimate tokens for a text using unified IPC
async function estimateTokens(text: string, modelId?: string): Promise<number> {
  try {
    const response = await window.api.request({
      type: 'utils:count-tokens',
      payload: { text, modelId },
    });
    // Ensure data is a number, provide a fallback if not.
    return typeof response.data === 'number' ? response.data : Math.ceil(text.length / 4);
  } catch {
    // Fallback: rough estimate of 1 token per 4 characters
    return Math.ceil(text.length / 4);
  }
}

/**
 * Calculates the cost based on prompt and completion tokens.
 * Pricing is per 1,000,000 tokens, so we divide by 1,000,000.
 */
export const calcCost = (
  promptTokens: number,
  completionTokens: number,
  pricing: Pricing
): number => {
  const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
  const completionCost = (completionTokens / 1_000_000) * pricing.completion;
  return promptCost + completionCost;
};

export async function estimateCost(
  rows: BatchRow[],
  allModels?: LLMModel[]
): Promise<CostEstimation> {
  let totalUSD = 0;
  const perRow: CostEstimation['perRow'] = [];

  // If allModels are passed, use them. Otherwise, use the legacy getModel from FS.
  const getModelFromCache = (id: string) =>
    allModels?.find((m) => m.id === id || `${m.provider}/${m.id}` === id);

  for (const row of rows) {
    const modelId = row.model || 'default';
    const model = allModels ? getModelFromCache(modelId) : getModel(modelId);
    const pricing = model?.pricing;

    if (!pricing) {
      console.warn(
        `Could not find pricing for model ${modelId}. Skipping cost estimation for this row.`
      );
      continue;
    }

    // Calculate input tokens
    let inputText = row.prompt;
    if (row.system) {
      inputText = row.system + '\n\n' + inputText;
    }
    if (row.data) {
      for (const value of Object.values(row.data)) {
        if (typeof value === 'string') {
          inputText += '\n' + value;
        }
      }
    }
    const tokens_in = await estimateTokens(inputText, modelId);

    // Calculate cost for input tokens only for estimation
    const inputCost = calcCost(tokens_in, 0, pricing);

    totalUSD += inputCost;
    perRow.push({
      id: row.id,
      tokens_in,
      est_cost: inputCost,
    });
  }

  return { totalUSD, perRow };
}

// Calculate actual cost after processing (when output tokens are known)
export async function calculateActualCost(
  row: BatchRow,
  tokensIn: number,
  tokensOut: number,
  allModels?: LLMModel[]
): Promise<number> {
  if (!row.model) {
    return 0;
  }
  const getModelFromCache = (id: string) =>
    allModels?.find((m) => m.id === id || `${m.provider}/${m.id}` === id);
  const model = allModels ? getModelFromCache(row.model) : getModel(row.model);

  if (!model?.pricing) {
    console.warn(`Could not find pricing for model ${row.model}. Returning 0 cost.`);
    return 0;
  }

  return calcCost(tokensIn, tokensOut, model.pricing);
}
