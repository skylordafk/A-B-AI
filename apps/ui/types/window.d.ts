import type { IpcRequest, IpcResponse } from '../src/types/ipc';

declare global {
  interface Window {
    api: {
      // Unified API endpoint - replaces all legacy methods
      request: <T extends IpcRequest>(request: T) => Promise<IpcResponse>;
    };
    ipc: {
      onOpenSettings: (callback: () => void) => () => void;
      onInvalidKey: (callback: (providerId: string) => void) => () => void;
    };
  }
}

export {};