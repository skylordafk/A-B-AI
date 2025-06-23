import type { BatchRow, CostEstimation } from '../../types/batch';
import { loadPricingData, getProviderAndModel } from './loadPricingData';

// Estimate tokens for a text using unified IPC
async function estimateTokens(text: string, modelId?: string): Promise<number> {
  try {
    const response = await window.api.request({
      type: 'tokens:count',
      payload: { text, modelId },
    });
    return response.data || Math.ceil(text.length / 4);
  } catch {
    // Fallback: rough estimate of 1 token per 4 characters
    return Math.ceil(text.length / 4);
  }
}

export async function estimateCost(rows: BatchRow[]): Promise<CostEstimation> {
  let totalUSD = 0;
  const perRow: CostEstimation['perRow'] = [];

  // Load pricing data from JSON file
  const pricing = await loadPricingData();

  for (const row of rows) {
    const { provider, model } = getProviderAndModel(row.model);

    // Calculate input tokens
    let inputText = row.prompt;
    if (row.system) {
      inputText = row.system + '\n\n' + inputText;
    }
    const tokens_in = await estimateTokens(inputText, row.model);

    // Look up pricing
    let promptPrice = 0;

    if (pricing[provider] && pricing[provider][model]) {
      const modelPricing = pricing[provider][model];
      promptPrice = modelPricing.prompt;
    } else {
      // Fallback to default model pricing
      const defaultPricing = pricing.openai['o3-2025-04-16'];
      promptPrice = defaultPricing.prompt;
    }

    // Skip if pricing is -1 (unavailable)
    if (promptPrice === -1) {
      perRow.push({
        id: row.id,
        tokens_in,
        est_cost: 0,
      });
      continue;
    }

    // Calculate cost for input tokens only
    const inputCost = (tokens_in / 1000) * promptPrice;

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
  tokensOut: number
): Promise<number> {
  const pricing = await loadPricingData();
  const { provider, model } = getProviderAndModel(row.model);

  let promptPrice = 0;
  let completionPrice = 0;

  if (pricing[provider] && pricing[provider][model]) {
    const modelPricing = pricing[provider][model];
    promptPrice = modelPricing.prompt;
    completionPrice = modelPricing.completion;
  } else {
    // Fallback to default pricing if model not found
    if (pricing.openai && pricing.openai['o3-2025-04-16']) {
      const defaultPricing = pricing.openai['o3-2025-04-16'];
      promptPrice = defaultPricing.prompt;
      completionPrice = defaultPricing.completion;
    } else {
      // Use safe fallback pricing
      promptPrice = 0.01; // $0.01 per 1K tokens as fallback
      completionPrice = 0.03; // $0.03 per 1K tokens as fallback
      console.warn(`No pricing data found for model ${row.model}, using fallback pricing`);
    }
  }

  // Skip if pricing is -1 (unavailable)
  if (promptPrice === -1 || completionPrice === -1) {
    return 0;
  }

  const inputCost = (tokensIn / 1000) * promptPrice;
  const outputCost = (tokensOut / 1000) * completionPrice;
  return inputCost + outputCost;
}
