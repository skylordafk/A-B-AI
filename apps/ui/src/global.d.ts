import type { JobQueueState } from './lib/batch/JobQueue';

interface Window {
  api: {
    saveApiKey(key: string): Promise<void>;
    saveApiKeyForProvider(
      id: 'openai' | 'anthropic' | 'grok' | 'gemini',
      key: string
    ): Promise<void>;
    getAllKeys(): Promise<
      Record<'openai' | 'anthropic' | 'grok' | 'gemini', { configured: boolean }>
    >;
    validateKey(id: 'openai' | 'anthropic' | 'grok' | 'gemini'): Promise<boolean>;
    sendPrompt(prompt: string): Promise<{
      answer: string;
      promptTokens: number;
      answerTokens: number;
      costUSD: number;
    }>;
    sendPrompts(
      prompt: string,
      ids: ('openai' | 'anthropic' | 'grok' | 'gemini')[],
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
    ): Promise<
      {
        provider: string;
        answer: string;
        promptTokens: number;
        answerTokens: number;
        costUSD: number;
      }[]
    >;
    sendToModel(
      modelId: string,
      prompt: string,
      systemPrompt?: string,
      temperature?: number
    ): Promise<{
      answer: string;
      promptTokens: number;
      answerTokens: number;
      costUSD: number;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
      };
      cost: number;
    }>;
    sendToModelWithFeatures?(
      modelId: string,
      prompt: string,
      options?: {
        systemPrompt?: string;
        temperature?: number;
        enablePromptCaching?: boolean;
        cacheTTL?: '5m' | '1h';
        cacheSystemPrompt?: boolean;
      }
    ): Promise<{
      answer: string;
      promptTokens: number;
      answerTokens: number;
      costUSD: number;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      };
      cost: number;
      provider: string;
      model: string;
    }>;
    getAvailableModels(): Promise<
      Array<{
        provider: string;
        models: Array<{
          id: string;
          name: string;
          description: string;
          contextSize: number;
          pricePrompt: number;
          priceCompletion: number;
        }>;
      }>
    >;
    countTokens(text: string, modelId?: string): Promise<number>;
    setMaxOutputTokens(value: number): Promise<void>;
    getMaxOutputTokens(): Promise<number>;
    // Web search settings
    setEnableWebSearch(value: boolean): Promise<void>;
    getEnableWebSearch(): Promise<boolean>;
    setMaxWebSearchUses(value: number): Promise<void>;
    getMaxWebSearchUses(): Promise<number>;
    // Extended thinking settings
    setEnableExtendedThinking(value: boolean): Promise<void>;
    getEnableExtendedThinking(): Promise<boolean>;
    // Prompt caching settings
    setEnablePromptCaching(value: boolean): Promise<void>;
    getEnablePromptCaching(): Promise<boolean>;
    setPromptCacheTTL(value: '5m' | '1h'): Promise<void>;
    getPromptCacheTTL(): Promise<'5m' | '1h'>;
    // Streaming settings
    setEnableStreaming(value: boolean): Promise<void>;
    getEnableStreaming(): Promise<boolean>;
    // Job queue state management
    saveJobQueueState?: (batchId: string, state: JobQueueState) => Promise<void>;
    loadJobQueueState?: (batchId: string) => Promise<JobQueueState | null>;
    clearJobQueueState?: (batchId: string) => Promise<void>;
    getStateDirectory?: () => Promise<string>;
    listFiles?: (directory: string) => Promise<string[]>;
    logHistory?: (project: string, row: Record<string, unknown>) => Promise<void>;
    openHistoryFolder?: (project: string) => Promise<void>;
    readHistory?: (project: string) => Promise<Record<string, unknown>[]>;
    similarity?: (expected: string, actual: string) => Promise<number>;
    costDelta?: () => Promise<number>;
    lastLatency?: () => Promise<number>;
  };
  ipc: {
    onOpenSettings(cb: () => void): void;
    onInvalidKey(cb: (providerId: string) => void): void;
  };
}
