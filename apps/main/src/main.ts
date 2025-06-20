import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import Store from 'electron-store';
import { chatWithOpenAI } from './providers/openai';
import { allProviders, ProviderId } from './providers';
import {
  getAllKeys,
  setKey,
  getKey,
  validateKey,
  setMaxOutputTokens,
  getMaxOutputTokens,
  setEnableWebSearch,
  getEnableWebSearch,
  setMaxWebSearchUses,
  getMaxWebSearchUses,
  setEnableExtendedThinking,
  getEnableExtendedThinking,
  setEnablePromptCaching,
  getEnablePromptCaching,
  setPromptCacheTTL,
  getPromptCacheTTL,
  setEnableStreaming,
  getEnableStreaming,
} from './settings';
import { get_encoding } from '@dqbd/tiktoken';
import { checkLicence } from './licensing/checkLicence';
import { append as appendHistory } from './history/append';

const isDev = !app.isPackaged && process.env.VITE_DEV_SERVER_URL;
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Store<{
  openaiKey?: string;
  anthropicKey?: string;
  grokKey?: string;
  geminiKey?: string;
}>() as unknown as Store<{
  openaiKey?: string;
  anthropicKey?: string;
  grokKey?: string;
  geminiKey?: string;
}>;

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

// Initialize tiktoken encoder
const tokenEncoder = get_encoding('cl100k_base');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
    win.loadFile(path.join(__dirname, '../../ui/dist/index.html'));
  }

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  // Return the window for use in menu
  return win;
}

// IPC handlers
ipcMain.handle('settings:saveApiKey', (_, id: ProviderId, key: string) => {
  setKey(id, key);
});

ipcMain.handle('settings:getAllKeys', () => {
  return getAllKeys();
});

ipcMain.handle('settings:validateKey', (_, id: ProviderId) => {
  return validateKey(id);
});

ipcMain.handle('settings:setMaxOutputTokens', (_, value: number) => {
  setMaxOutputTokens(value);
});

ipcMain.handle('settings:getMaxOutputTokens', () => {
  return getMaxOutputTokens();
});

// Web Search Settings
ipcMain.handle('settings:setEnableWebSearch', (_, value: boolean) => {
  setEnableWebSearch(value);
});

ipcMain.handle('settings:getEnableWebSearch', () => {
  return getEnableWebSearch();
});

ipcMain.handle('settings:setMaxWebSearchUses', (_, value: number) => {
  setMaxWebSearchUses(value);
});

ipcMain.handle('settings:getMaxWebSearchUses', () => {
  return getMaxWebSearchUses();
});

// Extended Thinking Settings
ipcMain.handle('settings:setEnableExtendedThinking', (_, value: boolean) => {
  setEnableExtendedThinking(value);
});

ipcMain.handle('settings:getEnableExtendedThinking', () => {
  return getEnableExtendedThinking();
});

// Prompt Caching Settings
ipcMain.handle('settings:setEnablePromptCaching', (_, value: boolean) => {
  setEnablePromptCaching(value);
});

ipcMain.handle('settings:getEnablePromptCaching', () => {
  return getEnablePromptCaching();
});

ipcMain.handle('settings:setPromptCacheTTL', (_, value: '5m' | '1h') => {
  setPromptCacheTTL(value);
});

ipcMain.handle('settings:getPromptCacheTTL', () => {
  return getPromptCacheTTL();
});

// Streaming Settings
ipcMain.handle('settings:setEnableStreaming', (_, value: boolean) => {
  setEnableStreaming(value);
});

ipcMain.handle('settings:getEnableStreaming', () => {
  return getEnableStreaming();
});

// Job Queue State Management
ipcMain.handle('jobqueue:saveState', (_, batchId: string, state: any) => {
  const stateDir = path.join(os.homedir(), '.abai', 'jobqueue');
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  const statePath = path.join(stateDir, `${batchId}.jobqueue`);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
});

ipcMain.handle('jobqueue:loadState', (_, batchId: string) => {
  const stateDir = path.join(os.homedir(), '.abai', 'jobqueue');
  const statePath = path.join(stateDir, `${batchId}.jobqueue`);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  const stateData = fs.readFileSync(statePath, 'utf-8');
  return JSON.parse(stateData);
});

ipcMain.handle('jobqueue:clearState', (_, batchId: string) => {
  const stateDir = path.join(os.homedir(), '.abai', 'jobqueue');
  const statePath = path.join(stateDir, `${batchId}.jobqueue`);

  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
});

ipcMain.handle('jobqueue:getStateDirectory', () => {
  return path.join(os.homedir(), '.abai', 'jobqueue');
});

ipcMain.handle('jobqueue:listFiles', (_, directory: string) => {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory);
});

// License management handlers
ipcMain.handle('license:store', (_, licenseKey: string) => {
  const licenseStore = new Store<{ cacheExpires: number; key: string }>({
    defaults: { cacheExpires: 0, key: '' },
  });

  licenseStore.set('key', licenseKey);
  licenseStore.set('cacheExpires', Date.now() + 72 * 60 * 60 * 1000); // 72 hours cache

  console.info('License key stored successfully');
  return true;
});

ipcMain.handle('license:get', () => {
  const licenseStore = new Store<{ cacheExpires: number; key: string }>({
    defaults: { cacheExpires: 0, key: '' },
  });

  return licenseStore.get('key');
});

ipcMain.handle('license:clear', () => {
  const licenseStore = new Store<{ cacheExpires: number; key: string }>({
    defaults: { cacheExpires: 0, key: '' },
  });

  licenseStore.clear();
  console.info('License cleared');
  return true;
});

// Legacy single-model chat handler for backward compatibility
ipcMain.handle('chat:send', async (_, prompt: string) => {
  const apiKey = store.get('openaiKey');
  if (!apiKey) throw new Error('API key not set');
  return chatWithOpenAI(apiKey, prompt);
});

// Multi-model chat handler with conversation history support and advanced features
ipcMain.handle(
  'chat:multiSend',
  async (
    _,
    prompt: string,
    ids: ProviderId[],
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ) => {
    const selected = allProviders.filter((p) => ids.includes(p.id as ProviderId));

    // Build the full conversation including the new prompt
    const messages = [...(conversationHistory || []), { role: 'user' as const, content: prompt }];

    // Get advanced feature settings
    const enableWebSearch = getEnableWebSearch();
    const enableExtendedThinking = getEnableExtendedThinking();
    const enablePromptCaching = getEnablePromptCaching();
    const cacheTTL = getPromptCacheTTL();
    const enableStreaming = getEnableStreaming();

    const results = await Promise.all(
      selected.map(async (p) => {
        try {
          let result;

          // Use enhanced features for Anthropic providers
          if (
            p.id === 'anthropic' &&
            (enableWebSearch || enableExtendedThinking || enablePromptCaching)
          ) {
            // Use the enhanced chatWithHistory method with advanced options
            result = await (p as any).chatWithHistory(messages, undefined, {
              enablePromptCaching,
              cacheTTL,
              enableStreaming,
              // Note: For real-time streaming in chat, we'd need WebSocket or similar
              // For now, streaming is mainly for batch processing
            });
          } else {
            // Use standard chatWithHistory for other providers
            result = await p.chatWithHistory(messages);
          }

          return result;
        } catch (error: any) {
          // Emit invalid key event if it's an auth error
          if (
            error.status === 401 ||
            error.status === 403 ||
            error.message?.includes('API key') ||
            error.message?.includes('authentication')
          ) {
            const win = BrowserWindow.getAllWindows()[0];
            if (win) {
              win.webContents.send('settings:invalidKey', p.id);
            }
          }
          return {
            answer: `Error: ${error.message}`,
            promptTokens: 0,
            answerTokens: 0,
            costUSD: 0,
          };
        }
      })
    );

    return results.map((r, i) => ({
      provider: selected[i].label,
      ...r,
      // Ensure cache information is passed through
      cacheCreationTokens: (r as any).cacheCreationTokens,
      cacheReadTokens: (r as any).cacheReadTokens,
    }));
  }
);

// Get available models handler
ipcMain.handle('models:getAvailable', async () => {
  return allProviders.map((provider) => ({
    provider: provider.label,
    models: provider.listModels(),
  }));
});

// Add IPC handler for token counting with model-specific support
ipcMain.handle('count-tokens', async (_event, text: string, modelId?: string) => {
  try {
    // For Claude models, use native token counting if available
    if (modelId?.includes('anthropic/claude') || modelId?.includes('claude')) {
      try {
        const anthropicProvider = allProviders.find((p) => p.id === 'anthropic');
        if (anthropicProvider && 'countTokens' in anthropicProvider) {
          return await (anthropicProvider as any).countTokens(text);
        }
      } catch (error) {
        console.info(
          '[Token Count] Native Claude counting failed, falling back to tiktoken:',
          error
        );
      }
    }

    // Default to tiktoken for other models
    const tokens = tokenEncoder.encode(text);
    return tokens.length;
  } catch (error) {
    console.error('Error counting tokens:', error);
    // Fallback: rough estimate of 1 token per 4 characters
    return Math.ceil(text.length / 4);
  }
});

// Add IPC handler for logging history
ipcMain.handle('history:log', async (_event, project: string, row: Record<string, unknown>) => {
  try {
    appendHistory(project, row);
  } catch (error) {
    console.error('Error logging history:', error);
  }
});

// Add IPC handler for opening history folder
ipcMain.handle('history:openFolder', async (_event, _project: string) => {
  try {
    const historyDir = path.join(os.homedir(), '.abai', 'history');
    await shell.openPath(historyDir);
  } catch (error) {
    console.error('Error opening history folder:', error);
  }
});

// Add IPC handler for reading history file
ipcMain.handle('history:read', async (_event, project: string) => {
  try {
    const historyDir = path.join(os.homedir(), '.abai', 'history');
    const historyFile = path.join(historyDir, `${project}.jsonl`);

    if (!fs.existsSync(historyFile)) {
      return [];
    }

    const content = fs.readFileSync(historyFile, 'utf-8');
    const lines = content
      .trim()
      .split('\n')
      .filter((line) => line.trim());

    return lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          console.error('Error parsing history line:', line, error);
          return null;
        }
      })
      .filter((entry) => entry !== null);
  } catch (error) {
    console.error('Error reading history file:', error);
    return [];
  }
});

// Enhanced chat handler for Claude with advanced features
ipcMain.handle(
  'chat:sendToModelWithFeatures',
  async (
    _,
    modelId: string,
    prompt: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      enablePromptCaching?: boolean;
      cacheTTL?: '5m' | '1h';
      cacheSystemPrompt?: boolean;
      enableStreaming?: boolean;
      onStreamChunk?: (chunk: string) => void;
    }
  ) => {
    // Parse provider from model ID
    const [providerName, ...modelParts] = modelId.split('/');
    const modelName = modelParts.join('/');

    // Find the provider
    const provider = allProviders.find((p) => p && p.id === providerName);
    if (!provider) {
      console.error(`[Main] Provider not found or undefined: ${providerName}`);
      throw new Error(`Unknown provider: ${providerName}`);
    }

    // Check if API key exists
    const apiKey = getKey(provider.id as ProviderId);
    if (!apiKey) {
      throw new Error(`Missing API key for provider: ${providerName}`);
    }

    try {
      let result;

      if (providerName === 'anthropic' && options?.enablePromptCaching) {
        // Use enhanced chatWithHistory method for Claude with caching
        const messages = [{ role: 'user' as const, content: prompt }];
        const anthropicProvider = allProviders.find((p) => p.id === 'anthropic');

        if (anthropicProvider && 'chatWithHistory' in anthropicProvider) {
          result = await (anthropicProvider as any).chatWithHistory(messages, modelId, {
            enablePromptCaching: options.enablePromptCaching,
            cacheTTL: options.cacheTTL,
            systemPrompt: options.systemPrompt,
            cacheSystemPrompt: options.cacheSystemPrompt,
            enableStreaming: options.enableStreaming,
            onStreamChunk: options.onStreamChunk,
          });
        } else {
          throw new Error('Enhanced Claude features not available');
        }
      } else {
        // Fall back to standard chat method
        let fullPrompt = prompt;
        if (options?.systemPrompt) {
          fullPrompt = `${options.systemPrompt}\n\n${prompt}`;
        }
        result = await provider.chat(fullPrompt, modelId);
      }

      // Get the specific model details
      const models = provider.listModels();
      const modelInfo = models.find((m) => modelId.includes(m.id) || m.id.includes(modelName));
      const modelLabel = modelInfo ? modelInfo.name : provider.label;

      return {
        answer: result.answer,
        promptTokens: result.promptTokens,
        answerTokens: result.answerTokens,
        costUSD: result.costUSD,
        usage: {
          prompt_tokens: result.promptTokens,
          completion_tokens: result.answerTokens,
          // Pass through cache usage if available
          cache_creation_input_tokens: (result as any).cacheCreationTokens,
          cache_read_input_tokens: (result as any).cacheReadTokens,
        },
        cost: result.costUSD,
        provider: modelLabel,
        model: modelId,
      };
    } catch (error: any) {
      // Check for auth errors
      if (
        error.status === 401 ||
        error.status === 403 ||
        error.message?.includes('API key') ||
        error.message?.includes('authentication')
      ) {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          win.webContents.send('settings:invalidKey', provider.id);
        }
      }
      throw error;
    }
  }
);

// Model-specific chat handler for batch processing
ipcMain.handle(
  'chat:sendToModel',
  async (_, modelId: string, prompt: string, systemPrompt?: string, _temperature?: number) => {
    // Parse provider from model ID
    const [providerName, ...modelParts] = modelId.split('/');
    const modelName = modelParts.join('/');

    // Find the provider
    const provider = allProviders.find((p) => p && p.id === providerName);
    if (!provider) {
      console.error(`[Main] Provider not found or undefined: ${providerName}`);
      throw new Error(`Unknown provider: ${providerName}`);
    }

    // Check if API key exists
    const apiKey = getKey(provider.id as ProviderId);
    if (!apiKey) {
      throw new Error(`Missing API key for provider: ${providerName}`);
    }

    try {
      // Build full prompt with system message if provided
      let fullPrompt = prompt;
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n${prompt}`;
      }

      // Pass the model ID to the provider's chat method
      const result = await provider.chat(fullPrompt, modelId);

      // Get the specific model details
      const models = provider.listModels();
      const modelInfo = models.find((m) => modelId.includes(m.id) || m.id.includes(modelName));
      const modelLabel = modelInfo ? modelInfo.name : provider.label;

      return {
        answer: result.answer,
        promptTokens: result.promptTokens,
        answerTokens: result.answerTokens,
        costUSD: result.costUSD,
        usage: {
          prompt_tokens: result.promptTokens,
          completion_tokens: result.answerTokens,
        },
        cost: result.costUSD,
        provider: modelLabel,
        model: modelId,
      };
    } catch (error: any) {
      // Check for auth errors
      if (
        error.status === 401 ||
        error.status === 403 ||
        error.message?.includes('API key') ||
        error.message?.includes('authentication')
      ) {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          win.webContents.send('settings:invalidKey', provider.id);
        }
      }
      throw error;
    }
  }
);

app.whenReady().then(async () => {
  console.info('[Main] App is ready');
  console.info('[Main] isDev:', isDev);
  console.info('[Main] app.isPackaged:', app.isPackaged);
  console.info('[Main] VITE_DEV_SERVER_URL:', process.env.VITE_DEV_SERVER_URL);
  console.info('[Main] NODE_ENV:', process.env.NODE_ENV);

  // Check license validity (skip in development)
  if (!isDev) {
    console.info('[Main] Running license check...');

    try {
      const licenseEndpoint = process.env.LICENCE_ENDPOINT || 'https://license.spventerprises.com';
      console.info('[Main] License endpoint:', licenseEndpoint);

      const isValid = await checkLicence();
      console.info('[Main] License check result:', isValid);

      if (!isValid) {
        console.info('[Main] No valid license - showing activation page');
        // Don't quit the app - instead, load the UI and navigate to activation
        const win = createWindow();

        // More robust navigation to activation page
        let navigationAttempts = 0;
        const maxAttempts = 5;

        const navigateToActivation = () => {
          navigationAttempts++;
          console.info(
            `[Main] Attempting to navigate to activation page (attempt ${navigationAttempts}/${maxAttempts})`
          );

          win.webContents
            .executeJavaScript(
              `
            console.info('[Renderer] Current hash:', window.location.hash);
            console.info('[Renderer] Navigating to activation page...');
            window.location.hash = '#/activate';
            console.info('[Renderer] New hash:', window.location.hash);
            
            // Force a re-render if using React Router
            if (window.dispatchEvent) {
              window.dispatchEvent(new HashChangeEvent('hashchange'));
            }
          `
            )
            .then(() => {
              console.info('[Main] Navigation script executed');

              // Check if we need to retry
              if (navigationAttempts < maxAttempts) {
                setTimeout(() => {
                  win.webContents.executeJavaScript(`window.location.hash`).then((hash) => {
                    console.info(`[Main] Current hash after navigation: ${hash}`);
                    if (hash !== '#/activate') {
                      navigateToActivation();
                    }
                  });
                }, 500);
              }
            })
            .catch((err) => {
              console.error('[Main] Navigation error:', err);
            });
        };

        // Wait for the app to fully load before navigating
        win.webContents.once('did-finish-load', () => {
          console.info('[Main] Window finished loading');
          // Give React time to initialize
          setTimeout(navigateToActivation, 1000);
        });

        // Also try navigating when DOM is ready
        win.webContents.once('dom-ready', () => {
          console.info('[Main] DOM ready');
        });

        // Set up the menu
        const isMac = process.platform === 'darwin';
        const template: Electron.MenuItemConstructorOptions[] = [
          // macOS app menu
          ...(isMac
            ? [
                {
                  label: app.getName(),
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
            submenu: [
              {
                label: 'Settings',
                accelerator: isMac ? 'Cmd+,' : 'Ctrl+,',
                click: () => {
                  win.webContents.send('menu:openSettings');
                },
              },
              { type: 'separator' },
              ...(isMac ? [] : [{ role: 'quit' as const }]),
            ],
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
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              ...(isMac
                ? [
                    { type: 'separator' as const },
                    {
                      label: 'Speech',
                      submenu: [
                        { role: 'startSpeaking' as const },
                        { role: 'stopSpeaking' as const },
                      ],
                    },
                  ]
                : []),
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
              { role: 'close' as const },
              ...(isMac ? [{ type: 'separator' as const }, { role: 'front' as const }] : []),
            ],
          },
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);

        return; // Exit early, don't create another window
      }
    } catch (error) {
      console.error('License check failed:', error);
      // Only show error dialog if we have a cached license but can't validate it
      // This indicates a real network/server issue, not just missing license
      const { default: Store } = await import('electron-store');
      const store = new Store({ defaults: { cacheExpires: 0, key: '' } });
      const { key } = store.store;

      if (key) {
        // User has a license but can't validate it - show error
        dialog.showErrorBox(
          'Licence Error',
          'Unable to validate licence. Please check your internet connection.'
        );
        app.quit();
        return;
      } else {
        // No license found and server unreachable - show activation page
        const win = createWindow();

        win.webContents.once('did-finish-load', () => {
          win.webContents.executeJavaScript(`
            if (window.location.hash !== '#/activate') {
              window.location.hash = '#/activate';
            }
          `);
        });

        // Set up the menu
        const isMac = process.platform === 'darwin';
        const template: Electron.MenuItemConstructorOptions[] = [
          // macOS app menu
          ...(isMac
            ? [
                {
                  label: app.getName(),
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
            submenu: [
              {
                label: 'Settings',
                accelerator: isMac ? 'Cmd+,' : 'Ctrl+,',
                click: () => {
                  win.webContents.send('menu:openSettings');
                },
              },
              { type: 'separator' },
              ...(isMac ? [] : [{ role: 'quit' as const }]),
            ],
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
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              ...(isMac
                ? [
                    { type: 'separator' as const },
                    {
                      label: 'Speech',
                      submenu: [
                        { role: 'startSpeaking' as const },
                        { role: 'stopSpeaking' as const },
                      ],
                    },
                  ]
                : []),
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
              { role: 'close' as const },
              ...(isMac ? [{ type: 'separator' as const }, { role: 'front' as const }] : []),
            ],
          },
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);

        return; // Exit early, don't create another window
      }
    }
  }

  const win = createWindow();

  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(isMac
      ? [
          {
            label: app.getName(),
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
      submenu: [
        {
          label: 'Settings',
          accelerator: isMac ? 'Cmd+,' : 'Ctrl+,',
          click: () => {
            win.webContents.send('menu:openSettings');
          },
        },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit' as const }]),
      ],
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
        { role: 'pasteAndMatchStyle' as const },
        { role: 'delete' as const },
        { role: 'selectAll' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' as const }, { role: 'stopSpeaking' as const }],
              },
            ]
          : []),
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
        { role: 'close' as const },
        ...(isMac ? [{ type: 'separator' as const }, { role: 'front' as const }] : []),
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
