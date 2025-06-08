import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { chatWithOpenAI } from './providers/openai';
import { allProviders, ProviderId } from './providers';
import { getAllKeys, setKey, getKey, validateKey } from './settings';

const isDev = !app.isPackaged;
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

  const url =
    isDev && VITE_DEV_SERVER_URL
      ? VITE_DEV_SERVER_URL
      : `file://${path.join(__dirname, '../../ui/dist/index.html')}`;

  win.loadURL(url);

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

app.whenReady().then(() => {
  const win = createWindow();

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          click: () => {
            win.webContents.send('open-settings');
          },
        },
        { type: 'separator' },
        { role: 'quit' },
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
