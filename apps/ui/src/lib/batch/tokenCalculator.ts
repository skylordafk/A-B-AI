import { loadPricingData, getProviderAndModel } from './loadPricingData';
import type { BatchRow } from '../../types/batch';

// Simple token estimation (approximation)
// This provides a rough estimate - actual tokenization can vary by model
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Simple heuristic: average of 4 characters per token for most models
  // This is a rough approximation but good enough for cost estimation
  const charCount = text.length;
  const tokenEstimate = Math.ceil(charCount / 4);

  // Add some buffer for formatting tokens
  return Math.max(1, tokenEstimate);
}

// Calculate input tokens for a batch row
export function calculateInputTokens(row: BatchRow): number {
  let totalTokens = 0;

  // System prompt tokens
  if (row.system) {
    totalTokens += estimateTokens(row.system);
  }

  // User prompt tokens
  if (row.prompt) {
    totalTokens += estimateTokens(row.prompt);
  }

  // JSON schema tokens (if provided)
  if (row.data?.jsonSchema) {
    totalTokens += estimateTokens(row.data.jsonSchema as string);
  }

  // Dynamic column tokens
  if (row.data) {
    Object.values(row.data).forEach((value) => {
      if (typeof value === 'string' && value) {
        totalTokens += estimateTokens(value);
      }
    });
  }

  // Add a small buffer for message formatting overhead
  return totalTokens + 10;
}

// Calculate output tokens (if response is available)
export function calculateOutputTokens(row: BatchRow & { response?: string }): number {
  if (!row.response) return 0;
  return estimateTokens(row.response);
}

// Cost calculation interface
export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  provider: string;
  model: string;
}

// Calculate cost for a single row
export async function calculateRowCost(
  row: BatchRow & { response?: string }
): Promise<CostBreakdown> {
  const pricingData = await loadPricingData();
  const { provider, model } = getProviderAndModel(row.model);

  const inputTokens = calculateInputTokens(row);
  const outputTokens = calculateOutputTokens(row);

  // Get pricing (per 1K tokens)
  const modelPricing = pricingData[provider]?.[model] || { prompt: 0, completion: 0 };

  // Calculate costs (pricing is per 1K tokens)
  const inputCost = (inputTokens / 1000) * modelPricing.prompt;
  const outputCost = (outputTokens / 1000) * modelPricing.completion;
  const totalCost = inputCost + outputCost;

  return {
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost,
    provider,
    model: model || 'default',
  };
}

// Calculate costs for multiple rows
export async function calculateBatchCosts(rows: (BatchRow & { response?: string })[]): Promise<{
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  rowCosts: CostBreakdown[];
}> {
  const rowCosts = await Promise.all(rows.map((row) => calculateRowCost(row)));

  const totalCost = rowCosts.reduce((sum, cost) => sum + cost.totalCost, 0);
  const totalInputTokens = rowCosts.reduce((sum, cost) => sum + cost.inputTokens, 0);
  const totalOutputTokens = rowCosts.reduce((sum, cost) => sum + cost.outputTokens, 0);

  return {
    totalCost,
    totalInputTokens,
    totalOutputTokens,
    rowCosts,
  };
}

// Format cost as currency
export function formatCost(cost: number): string {
  if (cost === 0) return 'Free';
  if (cost < 0.0001) return '<$0.0001';
  return `$${cost.toFixed(4)}`;
}

// Format token count with commas
export function formatTokens(tokens: number): string {
  return tokens.toLocaleString();
}
