import { app } from 'electron';

const isDev = !app.isPackaged;

export const logger = {
  log: (...args: any[]) => {
    // Always log in production for debugging
    console.log(...args);
  },

  info: (...args: any[]) => {
    // Always log info in production
    console.info(...args);
  },

  warn: (...args: any[]) => {
    // Always log warnings in production
    console.warn(...args);
  },

  error: (...args: any[]) => {
    // Always log errors in production
    console.error(...args);
  },

  debug: (...args: any[]) => {
    // Only debug in dev mode, but still allow in prod if needed
    if (isDev || process.env.ENABLE_DEBUG_LOGGING === 'true') {
      console.debug(...args);
    }
  },
};
