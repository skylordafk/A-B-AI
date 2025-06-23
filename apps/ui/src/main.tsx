import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';

// Ensure licensing routes work whether users include the `#/` hash or not (e.g. from an email link)
if (!window.location.hash && /^\/activate(-success)?/.test(window.location.pathname)) {
  window.location.replace(`/#${window.location.pathname}${window.location.search}`);
}

// Initialize Sentry for error tracking
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.PROD ? 'production' : 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend: (event) => {
      // Filter out sensitive information
      if (event.exception?.values?.[0]?.value?.includes('API key')) {
        return null;
      }
      return event;
    },
  });
}

import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
