import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock window.api for tests that need IPC communication
Object.defineProperty(window, 'api', {
  value: {
    countTokens: vi.fn(),
    // Add other API methods as needed
  },
  writable: true,
});
