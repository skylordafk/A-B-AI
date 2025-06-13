import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Ensure licensing routes work whether users include the `#/` hash or not (e.g. from an email link)
if (!window.location.hash && /^\/activate(-success)?/.test(window.location.pathname)) {
  window.location.replace(`/#${window.location.pathname}${window.location.search}`);
}

import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
