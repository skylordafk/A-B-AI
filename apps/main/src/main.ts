import { app, BrowserWindow, Menu, shell, ipcMain } from 'electron';
import * as Sentry from '@sentry/electron';
import path from 'path';
import type { ProviderId } from './providers';
import {
  getKey,
  getMaxOutputTokens,
  getEnableWebSearch,
  getMaxWebSearchUses,
  getEnableExtendedThinking,
  getEnablePromptCaching,
  getPromptCacheTTL,
  getEnableStreaming,
  getJsonMode,
  getReasoningEffort,
} from './settings';
import { registerChatControllerIpcHandlers } from './chatController'; // Import the new function
import './ipc/handlers'; // Initialize IPC router

// Register chat-specific IPC handlers
registerChatControllerIpcHandlers(ipcMain);

const isDev = !app.isPackaged && process.env.VITE_DEV_SERVER_URL;
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// Store removed - using settings module instead

// Set up global API key getter and max output tokens getter
(globalThis as Record<string, unknown>).getApiKey = (id: ProviderId) => {
  return getKey(id);
};
(globalThis as Record<string, unknown>).getMaxOutputTokens = () => {
  return getMaxOutputTokens();
};
(globalThis as Record<string, unknown>).getEnableWebSearch = () => {
  return getEnableWebSearch();
};
(globalThis as Record<string, unknown>).getMaxWebSearchUses = () => {
  return getMaxWebSearchUses();
};
(globalThis as Record<string, unknown>).getEnableExtendedThinking = () => {
  return getEnableExtendedThinking();
};
(globalThis as Record<string, unknown>).getEnablePromptCaching = () => {
  return getEnablePromptCaching();
};
(globalThis as Record<string, unknown>).getPromptCacheTTL = () => {
  return getPromptCacheTTL();
};
(globalThis as Record<string, unknown>).getEnableStreaming = () => {
  return getEnableStreaming();
};
(globalThis as Record<string, unknown>).getJsonMode = () => {
  return getJsonMode();
};
(globalThis as Record<string, unknown>).getReasoningEffort = () => {
  return getReasoningEffort();
};

// Initialize Sentry for error tracking
if (!isDev && process.env.SENTRY_DSN) {
  (Sentry as any).init({
    dsn: process.env.SENTRY_DSN,
    environment: app.isPackaged ? 'production' : 'development',
    release: app.getVersion(),
    beforeSend: (event: any) => {
      // Filter out sensitive information
      if (event.exception?.values?.[0]?.value?.includes('API key')) {
        return null;
      }
      return event;
    },
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Set Content Security Policy based on environment
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http: https: ws:;"
      : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https:;";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  // In development, load the Vite dev server URL. In production, use `loadFile` to avoid
  // malformed "file://" URLs on Windows that can trigger ERR_UNSUPPORTED_ESM_URL_SCHEME.
  if (isDev && VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // When running from apps/main/dist/main/index.js
    // We need to go to apps/ui/dist/index.html
    win.loadFile(path.join(__dirname, '../../../ui/dist/index.html'));
  }

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  // Allow dev tools in production with keyboard shortcut
  win.webContents.on('before-input-event', (event, input) => {
    // Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows/Linux)
    if (
      (input.meta && input.alt && input.key === 'i') ||
      (input.control && input.shift && input.key === 'I')
    ) {
      win.webContents.toggleDevTools();
    }
  });

  // Return the window for use in menu
  return win;
}

// IPC Router is automatically initialized when imported
// No need for manual IPC handler setup - the router handles everything

app.whenReady().then(() => {
  createWindow();

  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    // File menu
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' as const } : { role: 'quit' as const }],
    },
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' as const }, { role: 'stopSpeaking' as const }],
              },
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const },
            ]),
      ],
    },
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://electronjs.org');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
