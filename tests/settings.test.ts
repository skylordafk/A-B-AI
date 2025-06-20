import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron-store
vi.mock('electron-store', () => {
  const mockStoreInstance = {
    get: vi.fn(),
    set: vi.fn(),
  };
  return {
    default: vi.fn(() => mockStoreInstance),
  };
});

// Mock providers
vi.mock('../apps/main/src/providers', () => {
  const mockProvider = {
    id: 'test-provider',
    label: 'Test Provider',
    chat: vi.fn(),
  };
  return {
    allProviders: [mockProvider],
  };
});

// Import after mocking
import {
  getAllKeys,
  setKey,
  getKey,
  setMaxOutputTokens,
  getMaxOutputTokens,
  setEnableWebSearch,
  getEnableWebSearch,
  setMaxWebSearchUses,
  getMaxWebSearchUses,
  setEnableExtendedThinking,
  getEnableExtendedThinking,
  setEnablePromptCaching,
  getEnablePromptCaching,
  setPromptCacheTTL,
  getPromptCacheTTL,
  setEnableStreaming,
  getEnableStreaming,
  validateKey,
} from '../apps/main/src/settings';
import { allProviders } from '../apps/main/src/providers';

describe('Settings', () => {
  const mockProvider = (allProviders as any)[0];
  const mockStore = vi.mocked(require('electron-store').default)();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.get.mockClear();
    mockStore.set.mockClear();
  });

  describe('API Keys', () => {
    it('should get all keys configuration status', () => {
      mockStore.get.mockImplementation((key) => {
        switch (key) {
          case 'openaiKey':
            return 'test-key';
          case 'anthropicKey':
            return undefined;
          case 'grokKey':
            return 'grok-key';
          case 'geminiKey':
            return undefined;
          default:
            return undefined;
        }
      });

      const keys = getAllKeys();

      expect(keys).toEqual({
        openai: { configured: true },
        anthropic: { configured: false },
        grok: { configured: true },
        gemini: { configured: false },
      });
    });

    it('should set API keys for different providers', () => {
      setKey('openai', 'new-openai-key');
      setKey('anthropic', 'new-anthropic-key');
      setKey('grok', 'new-grok-key');
      setKey('gemini', 'new-gemini-key');

      expect(mockStore.set).toHaveBeenCalledWith('openaiKey', 'new-openai-key');
      expect(mockStore.set).toHaveBeenCalledWith('anthropicKey', 'new-anthropic-key');
      expect(mockStore.set).toHaveBeenCalledWith('grokKey', 'new-grok-key');
      expect(mockStore.set).toHaveBeenCalledWith('geminiKey', 'new-gemini-key');
    });

    it('should get API keys for different providers', () => {
      mockStore.get.mockImplementation((key) => {
        switch (key) {
          case 'openaiKey':
            return 'openai-key';
          case 'anthropicKey':
            return 'anthropic-key';
          case 'grokKey':
            return 'grok-key';
          case 'geminiKey':
            return 'gemini-key';
          default:
            return undefined;
        }
      });

      expect(getKey('openai')).toBe('openai-key');
      expect(getKey('anthropic')).toBe('anthropic-key');
      expect(getKey('grok')).toBe('grok-key');
      expect(getKey('gemini')).toBe('gemini-key');
    });

    it('should return undefined for invalid provider', () => {
      expect(getKey('invalid' as any)).toBe(undefined);
    });
  });

  describe('Max Output Tokens', () => {
    it('should set and get max output tokens', () => {
      setMaxOutputTokens(4096);
      expect(mockStore.set).toHaveBeenCalledWith('maxOutputTokens', 4096);

      mockStore.get.mockReturnValue(4096);
      expect(getMaxOutputTokens()).toBe(4096);
    });

    it('should return default value when not set', () => {
      mockStore.get.mockReturnValue(undefined);
      expect(getMaxOutputTokens()).toBe(8192);
    });
  });

  describe('Web Search Settings', () => {
    it('should set and get web search enabled', () => {
      setEnableWebSearch(true);
      expect(mockStore.set).toHaveBeenCalledWith('enableWebSearch', true);

      mockStore.get.mockReturnValue(true);
      expect(getEnableWebSearch()).toBe(true);
    });

    it('should return default value for web search', () => {
      mockStore.get.mockReturnValue(undefined);
      expect(getEnableWebSearch()).toBe(false);
    });

    it('should set and get max web search uses', () => {
      setMaxWebSearchUses(10);
      expect(mockStore.set).toHaveBeenCalledWith('maxWebSearchUses', 10);

      mockStore.get.mockReturnValue(10);
      expect(getMaxWebSearchUses()).toBe(10);
    });

    it('should return default value for max web search uses', () => {
      mockStore.get.mockReturnValue(undefined);
      expect(getMaxWebSearchUses()).toBe(5);
    });
  });

  describe('Extended Thinking Settings', () => {
    it('should set and get extended thinking enabled', () => {
      setEnableExtendedThinking(true);
      expect(mockStore.set).toHaveBeenCalledWith('enableExtendedThinking', true);

      mockStore.get.mockReturnValue(true);
      expect(getEnableExtendedThinking()).toBe(true);
    });

    it('should return default value for extended thinking', () => {
      mockStore.get.mockReturnValue(undefined);
      expect(getEnableExtendedThinking()).toBe(false);
    });
  });

  describe('Prompt Caching Settings', () => {
    it('should set and get prompt caching enabled', () => {
      setEnablePromptCaching(true);
      expect(mockStore.set).toHaveBeenCalledWith('enablePromptCaching', true);

      mockStore.get.mockReturnValue(true);
      expect(getEnablePromptCaching()).toBe(true);
    });

    it('should return default value for prompt caching', () => {
      mockStore.get.mockReturnValue(undefined);
      expect(getEnablePromptCaching()).toBe(false);
    });

    it('should set and get prompt cache TTL', () => {
      setPromptCacheTTL('1h');
      expect(mockStore.set).toHaveBeenCalledWith('promptCacheTTL', '1h');

      mockStore.get.mockReturnValue('1h');
      expect(getPromptCacheTTL()).toBe('1h');
    });

    it('should return default value for cache TTL', () => {
      mockStore.get.mockReturnValue(undefined);
      expect(getPromptCacheTTL()).toBe('5m');
    });
  });

  describe('Streaming Settings', () => {
    it('should set and get streaming enabled', () => {
      setEnableStreaming(true);
      expect(mockStore.set).toHaveBeenCalledWith('enableStreaming', true);

      mockStore.get.mockReturnValue(true);
      expect(getEnableStreaming()).toBe(true);
    });

    it('should return default value for streaming', () => {
      mockStore.get.mockReturnValue(undefined);
      expect(getEnableStreaming()).toBe(false);
    });
  });

  describe('Key Validation', () => {
    it('should return false if no key is set', async () => {
      mockStore.get.mockReturnValue(undefined);
      const result = await validateKey('openai');
      expect(result).toBe(false);
    });

    it('should return false if provider is not found', async () => {
      mockStore.get.mockReturnValue('test-key');
      const result = await validateKey('nonexistent' as any);
      expect(result).toBe(false);
    });

    it('should return true if key is valid', async () => {
      mockStore.get.mockReturnValue('test-key');
      mockProvider.chat.mockResolvedValue({ answer: 'Hello' });

      const result = await validateKey('test-provider' as any);
      expect(result).toBe(true);
      expect(mockProvider.chat).toHaveBeenCalledWith('Hello');
    });

    it('should return false for authentication errors', async () => {
      mockStore.get.mockReturnValue('invalid-key');
      const authError = new Error('API key invalid');
      authError.status = 401;
      mockProvider.chat.mockRejectedValue(authError);

      const result = await validateKey('test-provider' as any);
      expect(result).toBe(false);
    });

    it('should return true for non-auth errors (network issues)', async () => {
      mockStore.get.mockReturnValue('valid-key');
      const networkError = new Error('Network timeout');
      mockProvider.chat.mockRejectedValue(networkError);

      const result = await validateKey('test-provider' as any);
      expect(result).toBe(true);
    });

    it('should handle different auth error status codes', async () => {
      mockStore.get.mockReturnValue('invalid-key');

      // Test 403 error
      const forbiddenError = new Error('Forbidden');
      forbiddenError.status = 403;
      mockProvider.chat.mockRejectedValue(forbiddenError);

      expect(await validateKey('test-provider' as any)).toBe(false);

      // Test error message containing 'API key'
      mockProvider.chat.mockRejectedValue(new Error('Invalid API key provided'));
      expect(await validateKey('test-provider' as any)).toBe(false);

      // Test error message containing 'authentication'
      mockProvider.chat.mockRejectedValue(new Error('Authentication failed'));
      expect(await validateKey('test-provider' as any)).toBe(false);

      // Test error message containing 'unauthorized'
      mockProvider.chat.mockRejectedValue(new Error('Unauthorized access'));
      expect(await validateKey('test-provider' as any)).toBe(false);
    });
  });
});
