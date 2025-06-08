interface Window {
  api: {
    saveApiKey: (key: string) => Promise<void>;
    sendPrompt: (prompt: string) => Promise<{ answer: string; costUSD: number }>;
  };
  ipc: {
    onOpenSettings: (callback: () => void) => void;
  };
}
