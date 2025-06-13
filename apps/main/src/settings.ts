import Store from 'electron-store';
import { ProviderId, allProviders } from './providers';

interface StoreSchema {
  openaiKey?: string;
  anthropicKey?: string;
  grokKey?: string;
  geminiKey?: string;
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

export async function validateKey(provider: ProviderId): Promise<boolean> {
  const key = getKey(provider);
  if (!key) return false;

  const providerInstance = allProviders.find((p) => p.id === provider);
  if (!providerInstance) return false;

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

export { store };
