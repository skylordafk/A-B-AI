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
    countTokens(text: string): Promise<number>;
  };
  ipc: {
    onOpenSettings(cb: () => void): void;
    onInvalidKey(cb: (providerId: string) => void): void;
  };
}
