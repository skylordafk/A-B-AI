import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { loadPricing } from '../shared/utils/loadPricing';

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock window.api for tests that need IPC communication in a jsdom environment
if (typeof window !== 'undefined' && typeof window.api === 'undefined') {
  Object.defineProperty(window, 'api', {
    value: {
      countTokens: vi.fn(),
      // Add other API methods as needed
    },
    writable: true,
  });
}

// Mock the global window.api object for tests that run in a Node.js context
// but are designed to run in the renderer process.
if (typeof window !== 'undefined') {
  // @ts-expect-error - Mocking the global api for tests
  window.api = {
    request: vi.fn(async (arg) => {
      console.log(`Mock window.api.request called with:`, arg);
      // Return a default success response
      return { success: true, data: {} };
    }),
  };
} else {
  // If window is not defined (pure node environment)
  // We can mock it on the global scope
  const g = globalThis as any;
  g.window = {
    api: {
      request: vi.fn(async (arg) => {
        console.log(`Mock global.api.request called with:`, arg);
        if (arg.type === 'jobqueue:load-state') {
          return { success: true, data: null }; // Default empty state
        }
        return { success: true, data: {} };
      }),
    },
  };
}

// Mock the projectStore to provide models for component tests
vi.mock('../apps/ui/src/store/projectStore', () => ({
  useProjectStore: vi.fn(() => ({
    models: loadPricing(), // Provide models from the canonical source
    projects: [],
    currentProjectId: null,
    isLoading: false,
    // Add any other state or actions needed by components
  })),
}));
