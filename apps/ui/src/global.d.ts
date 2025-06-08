interface Window {
  api: {
    saveApiKey(key: string): Promise<void>;
    saveApiKeyForProvider(id: 'openai' | 'anthropic', key: string): Promise<void>;
    sendPrompt(prompt: string): Promise<{
      answer: string;
      promptTokens: number;
      answerTokens: number;
      costUSD: number;
    }>;
    sendPrompts(
      prompt: string,
      ids: ('openai' | 'anthropic')[]
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
  };
}
