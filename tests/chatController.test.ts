import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { ipcMain } from 'electron';

// Mock electron
vi.mock('electron', () => {
  const mockIpcMain = new EventEmitter();
  mockIpcMain.handle = vi.fn();
  return {
    ipcMain: mockIpcMain,
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
    ProviderId: 'test-provider',
  };
});

// Import after mocking
import { startChat } from '../apps/main/src/chatController';
import { allProviders } from '../apps/main/src/providers';

describe('ChatController', () => {
  const mockProvider = (allProviders as any)[0];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should create a chat controller with stream and abort methods', () => {
    const controller = startChat('Hello', ['test-provider'], 'session-1');

    expect(controller).toHaveProperty('stream');
    expect(controller).toHaveProperty('abort');
    expect(typeof controller.abort).toBe('function');
  });

  it('should stream responses from selected providers', async () => {
    mockProvider.chat.mockResolvedValue({
      answer: 'Test response',
      promptTokens: 10,
      answerTokens: 20,
      costUSD: 0.001,
    });

    const controller = startChat('Hello', ['test-provider'], 'session-1');
    const responses = [];

    for await (const response of controller.stream) {
      responses.push(JSON.parse(response));
      break; // Only get first response for test
    }

    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({
      provider: 'Test Provider',
      answer: 'Test response',
      promptTokens: 10,
      answerTokens: 20,
      costUSD: 0.001,
      complete: true,
    });
  });

  it('should handle provider errors gracefully', async () => {
    mockProvider.chat.mockRejectedValue(new Error('API Error'));

    const controller = startChat('Hello', ['test-provider'], 'session-1');
    const responses = [];

    for await (const response of controller.stream) {
      responses.push(JSON.parse(response));
      break;
    }

    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({
      provider: 'Test Provider',
      answer: 'Error: API Error',
      promptTokens: 0,
      answerTokens: 0,
      costUSD: 0,
      error: true,
    });
  });

  it('should abort chat when requested', async () => {
    mockProvider.chat.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

    const controller = startChat('Hello', ['test-provider'], 'session-1');

    // Start processing
    const streamPromise = (async () => {
      const responses = [];
      for await (const response of controller.stream) {
        responses.push(response);
      }
      return responses;
    })();

    // Abort immediately
    controller.abort();

    await expect(streamPromise).rejects.toThrow('Chat aborted');
  });

  it('should handle multiple providers', async () => {
    const secondProvider = {
      id: 'second-provider',
      label: 'Second Provider',
      chat: vi.fn().mockResolvedValue({
        answer: 'Second response',
        promptTokens: 15,
        answerTokens: 25,
        costUSD: 0.002,
      }),
    };

    // Correctly mock the providers for this test
    vi.spyOn(allProviders, 'filter').mockImplementation((callback: any) =>
      [mockProvider, secondProvider].filter(callback)
    );

    mockProvider.chat.mockResolvedValue({
      answer: 'First response',
      promptTokens: 10,
      answerTokens: 20,
      costUSD: 0.001,
    });

    const controller = startChat('Hello', ['test-provider', 'second-provider'], 'session-1');
    const responses = [];

    for await (const response of controller.stream) {
      responses.push(JSON.parse(response));
    }

    expect(responses).toHaveLength(2);
    expect(responses[0].provider).toBe('Test Provider');
    expect(responses[1].provider).toBe('Second Provider');
  });

  it('should register IPC handler for chat abort', () => {
    startChat('Hello', ['test-provider'], 'session-1');
    expect(ipcMain.handle).toHaveBeenCalledWith(
      'chat:abort',
      expect.any(Function)
    );
  });

  it('should clean up active controllers on completion', async () => {
    mockProvider.chat.mockResolvedValue({
      answer: 'Test response',
      promptTokens: 10,
      answerTokens: 20,
      costUSD: 0.001,
    });

    const controller = startChat('Hello', ['test-provider'], 'session-1');

    // Consume the stream
    for await (const _response of controller.stream) {
      // Just consume
    }

    // Controller should be cleaned up (can't directly test internal state,
    // but we can test that abort doesn't throw)
    expect(() => controller.abort()).not.toThrow();
  });
});
