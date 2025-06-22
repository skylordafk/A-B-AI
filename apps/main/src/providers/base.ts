import { ModelMeta } from '../types/model';

export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'grok' | 'test-provider';

// Legacy interface for backward compatibility
export interface LegacyProvider {
  id: ProviderId | string;
  label: string;
  chat(
    userPrompt: string,
    modelId?: string,
    options?: { abortSignal?: AbortSignal }
  ): Promise<ChatResult>;
  chatWithHistory(
    messages: ChatMessage[],
    modelId?: string,
    options?: { abortSignal?: AbortSignal }
  ): Promise<ChatResult>;
  listModels(): ModelMeta[];
  countTokens?(text: string): Promise<number>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string;
}

export interface ChatResult {
  answer: string;
  promptTokens: number;
  answerTokens: number;
  costUSD: number;
  // Optional cache information for Claude
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
}

export interface ProviderCapabilities {
  supportsJsonMode: boolean;
  supportsBatchAPI: boolean;
  supportsStreaming: boolean;
  supportsPromptCaching: boolean;
  supportsExtendedThinking: boolean;
  supportsWebSearch: boolean;
}

export interface ChatOptions {
  model?: string;
  pricing?: {
    prompt: number;
    completion: number;
    cacheWrite5m?: number;
    cacheWrite1h?: number;
    cacheRead?: number;
  };
  jsonMode?: boolean;
  jsonSchema?: object;
  enablePromptCaching?: boolean;
  cacheTTL?: '5m' | '1h';
  systemPrompt?: string;
  temperature?: number;
  abortSignal?: AbortSignal;
  enableStreaming?: boolean;
  onStreamChunk?: (chunk: string) => void;
}

export interface BaseProvider {
  id: ProviderId | string; // Allow string for mocks
  label: string; // "OpenAI o3" | "Claude Opus 4"

  getCapabilities(): ProviderCapabilities;

  chat(userPrompt: string, modelId?: string, options?: ChatOptions): Promise<ChatResult>;

  chatWithHistory(
    messages: ChatMessage[],
    modelId?: string,
    options?: ChatOptions
  ): Promise<ChatResult>;

  /** Return all models exposed by this provider. */
  listModels(): ModelMeta[];

  /** Optional native token counting (more accurate than tiktoken). */
  countTokens?(text: string): Promise<number>;

  // Optional batch API methods
  submitBatch?(jobs: any[]): Promise<string>;
  getBatchStatus?(batchId: string): Promise<any>;
  retrieveBatchResults?(batchId: string): Promise<any[]>;
}

// Helper functions for providers
export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  pricing: ChatOptions['pricing'],
  cacheTokens?: { creation?: number; read?: number }
): number {
  if (!pricing) return 0;

  let cost = (promptTokens * pricing.prompt + completionTokens * pricing.completion) / 1000000;

  // Add cache costs if applicable
  if (cacheTokens?.creation && pricing.cacheWrite5m) {
    cost += (cacheTokens.creation * pricing.cacheWrite5m) / 1000000;
  }
  if (cacheTokens?.read && pricing.cacheRead) {
    cost += (cacheTokens.read * pricing.cacheRead) / 1000000;
  }

  return cost;
}

export function modelSupportsFeature(
  capabilities: ProviderCapabilities,
  feature: keyof ProviderCapabilities
): boolean {
  return capabilities[feature];
}
