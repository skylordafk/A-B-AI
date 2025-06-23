import type { IpcMain } from 'electron';
import { allProviders, ProviderId } from './providers';
import { ChatOptions, ChatResult } from './providers/base';

// NOTE: `ipcMain` is imported inside the handler function to ensure
// it can be mocked correctly in tests.

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class ChatController {
  private abortController: AbortController;

  constructor() {
    this.abortController = new AbortController();
  }

  abort() {
    this.abortController.abort();
  }

  async *stream(prompt: string, providerIds: ProviderId[]): AsyncGenerator<string> {
    const providers = allProviders.filter((p) => providerIds.includes(p.id as ProviderId));

    const promises = providers.map(async (provider) => {
      try {
        const options: ChatOptions = {
          abortSignal: this.abortController.signal,
        };
        const result: ChatResult = await provider.chat(prompt, undefined, options);
        return {
          provider: provider.label,
          ...result,
          complete: true,
        };
      } catch (error: any) {
        return {
          provider: provider.label,
          answer: `Error: ${error.message}`,
          promptTokens: 0,
          answerTokens: 0,
          costUSD: 0,
          error: true,
        };
      }
    });

    for (const promise of promises) {
      try {
        const result = await promise;
        yield JSON.stringify(result);
      } catch (error: any) {
        yield JSON.stringify({
          error: true,
          answer: `Error: ${error.message}`,
        });
      }
    }
  }
}

export const activeControllers = new Map<string, ChatController>();

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export function startChat(
  prompt: string,
  providerIds: ProviderId[],
  sessionId: string
): ChatController {
  const controller = new ChatController();
  activeControllers.set(sessionId, controller);

  const stream = controller.stream(prompt, providerIds);
  (async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of stream) {
      // Just consume the stream to completion
    }
    activeControllers.delete(sessionId);
  })();

  return controller;
}

export function registerChatControllerIpcHandlers(ipcMain: IpcMain) {
  ipcMain.handle('chat:abort', (_, sessionId: string) => {
    const controller = activeControllers.get(sessionId);
    if (controller) {
      controller.abort();
      activeControllers.delete(sessionId);
      return { success: true, message: `Aborted session ${sessionId}` };
    }
    return { success: false, error: `No active session found for ID: ${sessionId}` };
  });
}
