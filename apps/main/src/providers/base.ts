import { ModelMeta } from '../types/model';

export interface ChatResult {
  answer: string;
  promptTokens: number;
  answerTokens: number;
  costUSD: number;
}

export interface BaseProvider {
  id: string; // "openai" | "anthropic"
  label: string; // "OpenAI o3" | "Claude Opus 4"
  chat(userPrompt: string): Promise<ChatResult>;
  /** Return all models exposed by this provider. */
  listModels(): ModelMeta[];
}
