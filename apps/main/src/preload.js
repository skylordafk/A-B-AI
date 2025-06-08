/* This file must remain as CommonJS (.js) because:
 * 1. Electron preload scripts run in a special context without TypeScript support
 * 2. ES modules are not supported in preload scripts without extra configuration
 * 3. Converting to TypeScript would break the preload functionality
 *
 * The window interface types are defined in: apps/ui/types/window.d.ts
 */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process
// to use the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  saveApiKey: (key) => ipcRenderer.invoke('settings:saveApiKey', key),
  sendPrompt: (prompt) => ipcRenderer.invoke('chat:send', prompt),
});

contextBridge.exposeInMainWorld('ipc', {
  onOpenSettings: (cb) => {
    ipcRenderer.on('open-settings', cb);
  },
});
