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
  // Unified API endpoint for ALL requests - replaces all legacy methods
  request: (request) => ipcRenderer.invoke('app:request', request),
});

contextBridge.exposeInMainWorld('ipc', {
  onOpenSettings: (cb) => {
    ipcRenderer.on('menu:openSettings', cb);
    return () => ipcRenderer.removeListener('menu:openSettings', cb);
  },
  onInvalidKey: (cb) => {
    const listener = (_, providerId) => cb(providerId);
    ipcRenderer.on('settings:invalidKey', listener);
    return () => ipcRenderer.removeListener('settings:invalidKey', listener);
  },
});