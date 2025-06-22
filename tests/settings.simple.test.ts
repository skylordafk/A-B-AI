import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron-store
vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

// Mock providers
vi.mock('../apps/main/src/providers', () => ({
  allProviders: [
    {
      id: 'openai',
      label: 'Test Provider',
      chat: vi.fn().mockResolvedValue({ answer: 'Hello' }),
    },
  ],
}));

// Import after mocking
import {
  getAllKeys,
  setKey,
  getKey,
  setMaxOutputTokens,
  getMaxOutputTokens,
  validateKey,
} from '../apps/main/src/settings';
import { store } from '../apps/main/src/settings';
import { allProviders } from '../apps/main/src/providers';

describe('Settings (Simple)', () => {
  const mockStore = store as any;

  beforeEach(() => {
    vi.clearAllMocks();
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

    it('should set API keys', () => {
      setKey('openai', 'new-key');
      expect(mockStore.set).toHaveBeenCalledWith('openaiKey', 'new-key');
    });

    it('should get API keys', () => {
      mockStore.get.mockReturnValue('test-key');
      expect(getKey('openai')).toBe('test-key');
    });
  });

  describe('Settings', () => {
    it('should set and get max output tokens', () => {
      setMaxOutputTokens(4096);
      expect(mockStore.set).toHaveBeenCalledWith('maxOutputTokens', 4096);

      mockStore.get.mockReturnValue(4096);
      expect(getMaxOutputTokens()).toBe(4096);
    });

    it('should return default when max output tokens not set', () => {
      mockStore.get.mockReturnValue(undefined);
      expect(getMaxOutputTokens()).toBe(8192);
    });
  });

  describe('Key Validation', () => {
    it('should return false if no key is set', async () => {
      mockStore.get.mockReturnValue(undefined);
      const result = await validateKey('openai');
      expect(result).toBe(false);
    });

    it('should return true if key is valid', async () => {
      mockStore.get.mockReturnValue('test-key');
      const result = await validateKey('openai');
      expect(result).toBe(true);
    });
  });
});
