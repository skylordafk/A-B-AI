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
  // New unified API endpoint for all requests
  request: (request) => ipcRenderer.invoke('app:request', request),
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
  // New multi-model prompt with conversation history
  sendPrompts: (prompt, ids, conversationHistory) =>
    ipcRenderer.invoke('chat:multiSend', prompt, ids, conversationHistory),
  // Model-specific prompt for batch processing
  sendToModel: (modelId, prompt, systemPrompt, temperature) =>
    ipcRenderer.invoke('chat:sendToModel', modelId, prompt, systemPrompt, temperature),
  // Enhanced model prompt with advanced features
  sendToModelWithFeatures: (modelId, prompt, options) =>
    ipcRenderer.invoke('chat:sendToModelWithFeatures', modelId, prompt, options),
  // Model-specific prompt for batch processing
  sendToModelBatch: (modelId, prompt, systemPrompt, temperature) =>
    ipcRenderer.invoke('chat:sendToModelBatch', modelId, prompt, systemPrompt, temperature),
  // Get available models
  getAvailableModels: () => ipcRenderer.invoke('models:getAvailable'),
  // Count tokens for a text
  countTokens: (text, modelId) => ipcRenderer.invoke('count-tokens', text, modelId),
  // Max output tokens settings
  setMaxOutputTokens: (value) => ipcRenderer.invoke('settings:setMaxOutputTokens', value),
  getMaxOutputTokens: () => ipcRenderer.invoke('settings:getMaxOutputTokens'),
  // Web search settings
  setEnableWebSearch: (value) => ipcRenderer.invoke('settings:setEnableWebSearch', value),
  getEnableWebSearch: () => ipcRenderer.invoke('settings:getEnableWebSearch'),
  setMaxWebSearchUses: (value) => ipcRenderer.invoke('settings:setMaxWebSearchUses', value),
  getMaxWebSearchUses: () => ipcRenderer.invoke('settings:getMaxWebSearchUses'),
  // Extended thinking settings
  setEnableExtendedThinking: (value) =>
    ipcRenderer.invoke('settings:setEnableExtendedThinking', value),
  getEnableExtendedThinking: () => ipcRenderer.invoke('settings:getEnableExtendedThinking'),
  // Prompt caching settings
  setEnablePromptCaching: (value) => ipcRenderer.invoke('settings:setEnablePromptCaching', value),
  getEnablePromptCaching: () => ipcRenderer.invoke('settings:getEnablePromptCaching'),
  setPromptCacheTTL: (value) => ipcRenderer.invoke('settings:setPromptCacheTTL', value),
  getPromptCacheTTL: () => ipcRenderer.invoke('settings:getPromptCacheTTL'),
  // Streaming settings
  setEnableStreaming: (value) => ipcRenderer.invoke('settings:setEnableStreaming', value),
  getEnableStreaming: () => ipcRenderer.invoke('settings:getEnableStreaming'),
  // JSON Mode settings
  setJsonMode: (value) => ipcRenderer.invoke('settings:setJsonMode', value),
  getJsonMode: () => ipcRenderer.invoke('settings:getJsonMode'),
  // Reasoning Effort settings
  setReasoningEffort: (value) => ipcRenderer.invoke('settings:setReasoningEffort', value),
  getReasoningEffort: () => ipcRenderer.invoke('settings:getReasoningEffort'),
  // Job queue state management
  saveJobQueueState: (batchId, state) => ipcRenderer.invoke('jobqueue:saveState', batchId, state),
  loadJobQueueState: (batchId) => ipcRenderer.invoke('jobqueue:loadState', batchId),
  clearJobQueueState: (batchId) => ipcRenderer.invoke('jobqueue:clearState', batchId),
  getStateDirectory: () => ipcRenderer.invoke('jobqueue:getStateDirectory'),
  listFiles: (directory) => ipcRenderer.invoke('jobqueue:listFiles', directory),
  // Log history
  logHistory: (project, row) => ipcRenderer.invoke('history:log', project, row),
  // Open history folder
  openHistoryFolder: (project) => ipcRenderer.invoke('history:openFolder', project),
  // Read history file
  readHistory: (project) => ipcRenderer.invoke('history:read', project),
  // License management
  storeLicense: (licenseKey) => ipcRenderer.invoke('license:store', licenseKey),
  getLicense: () => ipcRenderer.invoke('license:get'),
  clearLicense: () => ipcRenderer.invoke('license:clear'),
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
