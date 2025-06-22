import { app } from 'electron';

const isDev = !app.isPackaged;

export const logger = {
  log: (..._args: any[]) => {
    if (isDev) {
      // Logging disabled in production
    }
  },

  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    if (isDev) {
      console.error(...args);
    }
  },

  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
};
