import { ipcMain } from 'electron';
import { allProviders, ProviderId } from './providers';

interface ChatController {
  stream: AsyncIterable<string>;
  abort: () => void;
}

// Store active abort controllers
const activeControllers = new Map<string, AbortController>();

export function startChat(
  prompt: string,
  providerIds: ProviderId[],
  sessionId: string
): ChatController {
  const controller = new AbortController();
  activeControllers.set(sessionId, controller);

  // Create an async generator for streaming responses
  async function* streamResponses() {
    const selected = allProviders.filter((p) => providerIds.includes(p.id as ProviderId));

    try {
      for (const provider of selected) {
        if (controller.signal.aborted) {
          throw new Error('Chat aborted');
        }

        try {
          // Pass the abort signal to the provider's chat method
          const result = await provider.chat(prompt, undefined, {
            abortSignal: controller.signal,
          });

          yield JSON.stringify({
            provider: provider.label,
            ...result,
            complete: true,
          });
        } catch (err: any) {
          yield JSON.stringify({
            provider: provider.label,
            answer: `Error: ${err.message}`,
            promptTokens: 0,
            answerTokens: 0,
            costUSD: 0,
            error: true,
          });
        }
      }
    } finally {
      activeControllers.delete(sessionId);
    }
  }

  return {
    stream: streamResponses(),
    abort: () => {
      controller.abort();
      activeControllers.delete(sessionId);
    },
  };
}

// IPC handler for aborting chat
ipcMain.handle('chat:abort', (_, sessionId: string) => {
  const controller = activeControllers.get(sessionId);
  if (controller) {
    controller.abort();
    activeControllers.delete(sessionId);
  }
});
