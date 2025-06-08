import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';

const isDev = !app.isPackaged;
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

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
}

app.whenReady().then(() => {
  createWindow();

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          click: () => {
            // TODO: Implement settings window
            // eslint-disable-next-line no-console
            console.log('Settings clicked');
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
