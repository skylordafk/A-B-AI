import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipcMain } from 'electron'; // This will be the mocked version
import {
  registerChatControllerIpcHandlers,
  activeControllers,
  ChatController,
  startChat,
} from '../apps/main/src/chatController';
import { allProviders } from '../apps/main/src/providers';
import type { ProviderId } from '../apps/main/src/providers';

// Mock providers first
vi.mock('../apps/main/src/providers', () => {
  return {
    allProviders: [
      {
        id: 'test-provider',
        label: 'Test Provider',
        chat: vi.fn(),
      },
    ],
  };
});

// Mock the entire electron module
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {}, // Minimal mock for other parts
}));

describe('ChatController', () => {
  beforeEach(() => {
    // Reset mocks and active controllers before each test
    vi.clearAllMocks();
    activeControllers.clear();
  });

  it('should register an IPC handler for chat:abort', () => {
    registerChatControllerIpcHandlers(ipcMain);
    expect(ipcMain.handle).toHaveBeenCalledWith('chat:abort', expect.any(Function));
  });

  it('should abort the session when chat:abort is called', () => {
    registerChatControllerIpcHandlers(ipcMain);

    // Setup: create a controller and add it to the active map
    const controller = new ChatController();
    const sessionId = 'test-session-abort';
    const abortSpy = vi.spyOn(controller, 'abort');
    activeControllers.set(sessionId, controller);

    // Get the handler function that was registered with ipcMain.handle
    const handler = (ipcMain.handle as vi.Mock).mock.calls[0][1];
    handler(null, sessionId);

    // Assert that abort was called and the controller was removed
    expect(abortSpy).toHaveBeenCalled();
    expect(activeControllers.has(sessionId)).toBe(false);
  });

  it('should clean up active controllers after stream completes', async () => {
    const mockProvider = (allProviders as any)[0];
    mockProvider.chat.mockResolvedValue({ answer: 'done' });

    const sessionId = 'session-cleanup';
    const controller = startChat('Hello', ['test-provider' as ProviderId], sessionId);
    expect(activeControllers.has(sessionId)).toBe(true);

    // Consume the stream to completion
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of controller.stream('Hello', ['test-provider' as ProviderId])) {
      // do nothing
    }

    // Allow the async cleanup logic in startChat to run
    await new Promise((resolve) => setImmediate(resolve));

    expect(activeControllers.has(sessionId)).toBe(false);
  });
});
