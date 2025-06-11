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
  // Legacy single key save (for backward compatibility)
  saveApiKey: (key) => ipcRenderer.invoke('settings:saveApiKey', 'openai', key),
  // New multi-provider key save
  saveApiKeyForProvider: (id, key) => ipcRenderer.invoke('settings:saveApiKey', id, key),
  // Get all API keys
  getAllKeys: () => ipcRenderer.invoke('settings:getAllKeys'),
  // Validate a specific API key
  validateKey: (id) => ipcRenderer.invoke('settings:validateKey', id),
  // Legacy single prompt
  sendPrompt: (prompt) => ipcRenderer.invoke('chat:send', prompt),
  // New multi-model prompt
  sendPrompts: (prompt, ids) => ipcRenderer.invoke('chat:multiSend', prompt, ids),
  // Model-specific prompt for batch processing
  sendToModel: (modelId, prompt, systemPrompt, temperature) =>
    ipcRenderer.invoke('chat:sendToModel', modelId, prompt, systemPrompt, temperature),
  // Get available models
  getAvailableModels: () => ipcRenderer.invoke('models:getAvailable'),
  // Count tokens for a text
  countTokens: (text) => ipcRenderer.invoke('count-tokens', text),
});

contextBridge.exposeInMainWorld('ipc', {
  onOpenSettings: (cb) => {
    ipcRenderer.on('menu:openSettings', cb);
  },
  onInvalidKey: (cb) => {
    ipcRenderer.on('settings:invalidKey', (_, providerId) => cb(providerId));
  },
});
