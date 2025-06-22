import { ModelMeta } from '../types/model';

export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'grok' | 'test-provider';

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

export interface BaseProvider {
  id: ProviderId | string; // Allow string for mocks
  label: string; // "OpenAI o3" | "Claude Opus 4"
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
  /** Return all models exposed by this provider. */
  listModels(): ModelMeta[];
  /** Optional native token counting (more accurate than tiktoken). */
  countTokens?(text: string): Promise<number>;
}
