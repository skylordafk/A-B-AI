import { ModelMeta } from '../types/model';

export interface ChatMessage {
  role: 'user' | 'assistant';
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
  id: string; // "openai" | "anthropic"
  label: string; // "OpenAI o3" | "Claude Opus 4"
  chat(userPrompt: string, modelId?: string): Promise<ChatResult>;
  chatWithHistory(messages: ChatMessage[], modelId?: string): Promise<ChatResult>;
  /** Return all models exposed by this provider. */
  listModels(): ModelMeta[];
  /** Optional native token counting (more accurate than tiktoken). */
  countTokens?(text: string): Promise<number>;
}
