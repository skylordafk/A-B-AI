import type { ModelMeta } from '../../main/src/types/model';

interface Window {
  api: {
    saveApiKey: (key: string) => Promise<void>;
    saveApiKeyForProvider: (
      id: 'openai' | 'anthropic' | 'grok' | 'gemini',
      key: string
    ) => Promise<void>;
    getAllKeys: () => Promise<
      Record<'openai' | 'anthropic' | 'grok' | 'gemini', { configured: boolean }>
    >;
    validateKey: (id: 'openai' | 'anthropic' | 'grok' | 'gemini') => Promise<boolean>;
    sendPrompt: (prompt: string) => Promise<{ answer: string; costUSD: number }>;
    sendPrompts: (
      prompt: string,
      ids: ('openai' | 'anthropic' | 'grok' | 'gemini')[]
    ) => Promise<
      Array<{
        provider: string;
        answer: string;
        promptTokens: number;
        answerTokens: number;
        costUSD: number;
      }>
    >;
    getAvailableModels: () => Promise<Array<{ provider: string; models: ModelMeta[] }>>;
    countTokens: (text: string) => Promise<number>;
  };
  ipc: {
    onOpenSettings: (callback: () => void) => void;
    onInvalidKey: (callback: (providerId: string) => void) => void;
  };
}
