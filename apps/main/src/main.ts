import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import Store from 'electron-store';
import { chatWithOpenAI } from './providers/openai';
import { allProviders, ProviderId } from './providers';
import { getAllKeys, setKey, getKey, validateKey } from './settings';
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
}>() as any;

// Set up global API key getter
(globalThis as any).getApiKey = (id: ProviderId) => {
  return getKey(id);
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

ipcMain.handle('settings:validateKey', async (_, id: ProviderId) => {
  return validateKey(id);
});

// Legacy single-model chat handler for backward compatibility
ipcMain.handle('chat:send', async (_, prompt: string) => {
  const apiKey = store.get('openaiKey');
  if (!apiKey) throw new Error('API key not set');
  return chatWithOpenAI(apiKey, prompt);
});

// Multi-model chat handler
ipcMain.handle('chat:multiSend', async (_, prompt: string, ids: ProviderId[]) => {
  const selected = allProviders.filter((p) => ids.includes(p.id as ProviderId));
  const results = await Promise.all(
    selected.map((p) =>
      p.chat(prompt).catch((err) => {
        // Emit invalid key event if it's an auth error
        if (
          err.status === 401 ||
          err.status === 403 ||
          err.message?.includes('API key') ||
          err.message?.includes('authentication')
        ) {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) {
            win.webContents.send('settings:invalidKey', p.id);
          }
        }
        return {
          answer: `Error: ${err.message}`,
          promptTokens: 0,
          answerTokens: 0,
          costUSD: 0,
        };
      })
    )
  );
  return results.map((r, i) => ({ provider: selected[i].label, ...r }));
});

// Get available models handler
ipcMain.handle('models:getAvailable', async () => {
  return allProviders.map((provider) => ({
    provider: provider.label,
    models: provider.listModels(),
  }));
});

// Add IPC handler for token counting
ipcMain.handle('count-tokens', async (_event, text: string) => {
  try {
    const tokens = tokenEncoder.encode(text);
    return tokens.length;
  } catch (error) {
    console.error('Error counting tokens:', error);
    // Fallback: rough estimate of 1 token per 4 characters
    return Math.ceil(text.length / 4);
  }
});

// Add IPC handler for logging history
ipcMain.handle('history:log', async (_event, project: string, row: any) => {
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

// Model-specific chat handler for batch processing
ipcMain.handle(
  'chat:sendToModel',
  async (_, modelId: string, prompt: string, systemPrompt?: string, _temperature?: number) => {
    // Parse provider from model ID
    const [providerName, ...modelParts] = modelId.split('/');
    const modelName = modelParts.join('/');

    // Find the provider
    const provider = allProviders.find((p) => p.id === providerName);
    if (!provider) {
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
  // Check license validity (skip in development)
  if (!isDev) {
    try {
      const isValid = await checkLicence(process.env.LICENCE_ENDPOINT || 'http://localhost:4100');
      if (!isValid) {
        dialog.showErrorBox('Licence Error', 'Your ABAI licence is invalid or expired.');
        app.quit();
        return;
      }
    } catch (error) {
      console.error('License check failed:', error);
      dialog.showErrorBox(
        'Licence Error',
        'Unable to validate licence. Please check your internet connection.'
      );
      app.quit();
      return;
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
