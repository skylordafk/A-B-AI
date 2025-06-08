interface Window {
  api: {
    saveApiKey(key: string): Promise<void>;
    saveApiKeyForProvider(
      id: 'openai' | 'anthropic' | 'grok' | 'gemini',
      key: string
    ): Promise<void>;
    getAllKeys(): Promise<Record<'openai' | 'anthropic' | 'grok' | 'gemini', string | undefined>>;
    validateKey(id: 'openai' | 'anthropic' | 'grok' | 'gemini'): Promise<boolean>;
    sendPrompt(prompt: string): Promise<{
      answer: string;
      promptTokens: number;
      answerTokens: number;
      costUSD: number;
    }>;
    sendPrompts(
      prompt: string,
      ids: ('openai' | 'anthropic' | 'grok' | 'gemini')[]
    ): Promise<
      {
        provider: string;
        answer: string;
        promptTokens: number;
        answerTokens: number;
        costUSD: number;
      }[]
    >;
  };
  ipc: {
    onOpenSettings(cb: () => void): void;
    onInvalidKey(cb: (providerId: string) => void): void;
  };
}
