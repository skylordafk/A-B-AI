import Anthropic from '@anthropic-ai/sdk';
import { encoding_for_model } from '@dqbd/tiktoken';

// ========================================
// Core Types and Interfaces
// ========================================

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
}

export interface PricingInfo {
  prompt: number;
  completion: number;
  cacheWrite5m?: number;
  cacheWrite1h?: number;
  cacheRead?: number;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'grok';

// ========================================
// Token Counting Utilities
// ========================================

/**
 * Provider-agnostic token counting with native API support and fallbacks
 */
export async function countTokens(
  text: string,
  provider: ProviderType,
  model?: string
): Promise<number> {
  switch (provider) {
    case 'anthropic':
      return countTokensAnthropic(text);
    case 'openai':
      return countTokensOpenAI(text, model);
    case 'gemini':
    case 'grok':
      return countTokensApproximation(text);
    default:
      return countTokensApproximation(text);
  }
}

/**
 * Anthropic native token counting with tiktoken fallback
 */
async function countTokensAnthropic(text: string): Promise<number> {
  const apiKey = (globalThis as any).getApiKey?.('anthropic');
  if (!apiKey) {
    return countTokensApproximation(text);
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.countTokens({
      model: 'claude-3-7-sonnet-20250219',
      messages: [{ role: 'user', content: text }],
    });
    return response.input_tokens;
  } catch (error) {
    console.warn(
      '[CoreLLM] Anthropic native token counting failed, using tiktoken fallback:',
      error
    );
    // Fallback to tiktoken approximation
    const enc = encoding_for_model('gpt-4' as any);
    return enc.encode(text).length;
  }
}

/**
 * OpenAI tiktoken-based token counting with model-specific encodings
 */
function countTokensOpenAI(text: string, model?: string): number {
  let encodingModel: string;

  if (model?.includes('gpt-4')) {
    encodingModel = 'gpt-4';
  } else if (model?.includes('gpt-3.5')) {
    encodingModel = 'gpt-3.5-turbo';
  } else {
    encodingModel = 'gpt-4';
  }

  const enc = encoding_for_model(encodingModel as any);
  return enc.encode(text).length;
}

/**
 * Character-based token approximation for providers without native counting
 */
function countTokensApproximation(text: string): number {
  return Math.ceil(text.length / 4);
}

// ========================================
// Cost Calculation Utilities
// ========================================

/**
 * Centralized cost calculation with support for caching
 */
export function calcCost(tokens: TokenUsage, pricing: PricingInfo): number {
  if (!pricing) return 0;

  // Base cost: prompt and completion tokens
  let cost =
    (tokens.promptTokens * pricing.prompt + tokens.completionTokens * pricing.completion) / 1000000;

  // Add cache costs if applicable
  if (tokens.cacheCreationTokens && pricing.cacheWrite5m) {
    cost += (tokens.cacheCreationTokens * pricing.cacheWrite5m) / 1000000;
  }
  if (tokens.cacheReadTokens && pricing.cacheRead) {
    cost += (tokens.cacheReadTokens * pricing.cacheRead) / 1000000;
  }

  return cost;
}

/**
 * Calculate cost using the legacy format from model-pricing.json
 * Converts per-1M pricing to standard format
 */
export function calcCostFromLegacyPricing(
  promptTokens: number,
  completionTokens: number,
  pricing: PricingInfo
): number {
  const tokens: TokenUsage = { promptTokens, completionTokens };
  return calcCost(tokens, pricing);
}

// ========================================
// Retry Logic Utilities
// ========================================

/**
 * Exponential backoff retry utility with configurable options
 */
export async function withRetries<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, baseDelay = 1000, maxDelay = 10000, backoffFactor = 2 } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);

      console.warn(
        `[CoreLLM] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms:`,
        error
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// ========================================
// Provider Detection Utilities
// ========================================

/**
 * Extract provider and model from model ID string
 */
export function parseModelId(modelId: string): { provider: ProviderType; model: string } {
  if (modelId.includes('/')) {
    const [provider, model] = modelId.split('/', 2);
    return {
      provider: provider as ProviderType,
      model,
    };
  }

  // Fallback: detect provider from model name
  if (modelId.startsWith('claude-') || modelId.includes('anthropic')) {
    return { provider: 'anthropic', model: modelId };
  }
  if (modelId.startsWith('gpt-') || modelId.startsWith('o') || modelId.includes('openai')) {
    return { provider: 'openai', model: modelId };
  }
  if (modelId.startsWith('gemini-') || modelId.includes('gemini')) {
    return { provider: 'gemini', model: modelId };
  }
  if (modelId.startsWith('grok-') || modelId.includes('grok')) {
    return { provider: 'grok', model: modelId };
  }

  // Default to OpenAI
  return { provider: 'openai', model: modelId };
}

// ========================================
// Legacy Compatibility
// ========================================

/**
 * Legacy helper for calculating cost (backward compatibility)
 */
export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  pricing: PricingInfo,
  cacheTokens?: { creation?: number; read?: number }
): number {
  const tokens: TokenUsage = {
    promptTokens,
    completionTokens,
    cacheCreationTokens: cacheTokens?.creation,
    cacheReadTokens: cacheTokens?.read,
  };
  return calcCost(tokens, pricing);
}
