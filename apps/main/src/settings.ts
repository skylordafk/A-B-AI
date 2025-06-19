import Store from 'electron-store';
import { ProviderId, allProviders } from './providers';

interface StoreSchema {
  openaiKey?: string;
  anthropicKey?: string;
  grokKey?: string;
  geminiKey?: string;
  maxOutputTokens?: number; // 0 means no limit
  enableWebSearch?: boolean; // Enable web search tool for Claude
  enableExtendedThinking?: boolean; // Enable extended thinking for Claude
  maxWebSearchUses?: number; // Maximum web searches per request
  enablePromptCaching?: boolean; // Enable prompt caching for Claude
  promptCacheTTL?: '5m' | '1h'; // Cache time-to-live
  enableStreaming?: boolean; // Enable streaming responses for real-time display
  jsonMode?: boolean;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Store<StoreSchema>() as any;

export function getAllKeys(): Record<ProviderId, { configured: boolean }> {
  return {
    openai: { configured: !!store.get('openaiKey') },
    anthropic: { configured: !!store.get('anthropicKey') },
    grok: { configured: !!store.get('grokKey') },
    gemini: { configured: !!store.get('geminiKey') },
  };
}

export function setKey(provider: ProviderId, value: string): void {
  switch (provider) {
    case 'openai':
      store.set('openaiKey', value);
      break;
    case 'anthropic':
      store.set('anthropicKey', value);
      break;
    case 'grok':
      store.set('grokKey', value);
      break;
    case 'gemini':
      store.set('geminiKey', value);
      break;
  }
}

export function getKey(provider: ProviderId): string | undefined {
  switch (provider) {
    case 'openai':
      return store.get('openaiKey');
    case 'anthropic':
      return store.get('anthropicKey');
    case 'grok':
      return store.get('grokKey');
    case 'gemini':
      return store.get('geminiKey');
    default:
      return undefined;
  }
}

export function setMaxOutputTokens(value: number): void {
  store.set('maxOutputTokens', value);
}

export function getMaxOutputTokens(): number {
  // Default to 8192 tokens if not set, 0 means no limit
  return store.get('maxOutputTokens') ?? 8192;
}

// Web Search Settings
export function setEnableWebSearch(value: boolean): void {
  store.set('enableWebSearch', value);
}

export function getEnableWebSearch(): boolean {
  return store.get('enableWebSearch') ?? false;
}

export function setMaxWebSearchUses(value: number): void {
  store.set('maxWebSearchUses', value);
}

export function getMaxWebSearchUses(): number {
  return store.get('maxWebSearchUses') ?? 5;
}

// Extended Thinking Settings
export function setEnableExtendedThinking(value: boolean): void {
  store.set('enableExtendedThinking', value);
}

export function getEnableExtendedThinking(): boolean {
  return store.get('enableExtendedThinking') ?? false;
}

// Prompt Caching Settings
export function setEnablePromptCaching(value: boolean): void {
  store.set('enablePromptCaching', value);
}

export function getEnablePromptCaching(): boolean {
  return store.get('enablePromptCaching') ?? false;
}

export function setPromptCacheTTL(value: '5m' | '1h'): void {
  store.set('promptCacheTTL', value);
}

export function getPromptCacheTTL(): '5m' | '1h' {
  return store.get('promptCacheTTL') ?? '5m';
}

// Streaming Settings
export function setEnableStreaming(value: boolean): void {
  store.set('enableStreaming', value);
}

export function getEnableStreaming(): boolean {
  return store.get('enableStreaming') ?? false;
}

// JSON Mode Settings
export function setJsonMode(value: boolean): void {
  store.set('jsonMode', value);
}

export function getJsonMode(): boolean {
  // Default true for o-series strict JSON support
  return store.get('jsonMode') ?? true;
}

// Reasoning Effort Settings
export function setReasoningEffort(value: 'low' | 'medium' | 'high'): void {
  store.set('reasoningEffort', value);
}

export function getReasoningEffort(): 'low' | 'medium' | 'high' {
  return (store.get('reasoningEffort') as 'low' | 'medium' | 'high') ?? 'high';
}

export async function validateKey(provider: ProviderId): Promise<boolean> {
  const key = getKey(provider);
  if (!key) return false;

  const providerInstance = allProviders.find((p) => p && p.id === provider);
  if (!providerInstance) {
    console.error(`[Settings] Provider not found or undefined: ${provider}`);
    return false;
  }

  try {
    // Try a simple test prompt
    await providerInstance.chat('Hello');
    return true;
  } catch (error: any) {
    // Check for authentication errors
    if (
      error.status === 401 ||
      error.status === 403 ||
      error.message?.includes('API key') ||
      error.message?.includes('authentication') ||
      error.message?.includes('unauthorized')
    ) {
      return false;
    }
    // Other errors might be network issues, so we consider the key valid
    return true;
  }
}

// Export default settings (used in UI forms)
export const defaultSettings = {
  jsonMode: true,
  reasoningEffort: 'high',
};

export { store };
