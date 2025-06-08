import { contextBridge, ipcRenderer } from 'electron';

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
