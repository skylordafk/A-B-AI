import { app, BrowserWindow, Menu, ipcMain, shell } from 'electron';
import path from 'path';
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
  getJsonMode,
  getReasoningEffort,
  setJsonMode,
  setReasoningEffort,
} from './settings';
// import { checkLicence } from './licensing/checkLicence';
import { ipcRouter } from './ipc/handlers';
// import { logger } from './utils/logger';

const isDev = !app.isPackaged && process.env.VITE_DEV_SERVER_URL;
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Store() as any;

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

// Initialize services
const modelService = new ModelService();
const database = new Database();
const tokenEncoder = get_encoding('cl100k_base');

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

  // Return the window for use in menu
  return win;
}

// Unified IPC handler - replaces all individual handlers
ipcMain.handle('app:request', async (event, request: AppRequest): Promise<AppResponse> => {
  try {
    // Only log in development mode to avoid EPIPE errors in packaged app
    if (isDev) {
      console.log(`IPC Request: ${request.type}`, request.payload);
    }

    switch (request.type) {
      case 'models:get-all':
        return { success: true, data: modelService.getAllModels() };

      case 'settings:save': {
        const { key, value, provider } = request.payload || {};
        if (provider && key === 'apiKey') {
          setKey(provider as ProviderId, value);
        } else if (key === 'maxOutputTokens') {
          setMaxOutputTokens(value);
        } else if (key === 'enableWebSearch') {
          setEnableWebSearch(value);
        } else if (key === 'maxWebSearchUses') {
          setMaxWebSearchUses(value);
        } else if (key === 'enableExtendedThinking') {
          setEnableExtendedThinking(value);
        } else if (key === 'enablePromptCaching') {
          setEnablePromptCaching(value);
        } else if (key === 'promptCacheTTL') {
          setPromptCacheTTL(value);
        } else if (key === 'enableStreaming') {
          setEnableStreaming(value);
        } else if (key === 'jsonMode') {
          setJsonMode(value);
        } else if (key === 'reasoningEffort') {
          setReasoningEffort(value);
        }
        return { success: true, data: null };
      }

      case 'settings:load': {
        const { key, provider } = request.payload || {};
        let data;
        if (provider && key === 'apiKey') {
          data = getKey(provider as ProviderId);
        } else if (key === 'allKeys') {
          data = getAllKeys();
        } else if (key === 'maxOutputTokens') {
          data = getMaxOutputTokens();
        } else if (key === 'enableWebSearch') {
          data = getEnableWebSearch();
        } else if (key === 'maxWebSearchUses') {
          data = getMaxWebSearchUses();
        } else if (key === 'enableExtendedThinking') {
          data = getEnableExtendedThinking();
        } else if (key === 'enablePromptCaching') {
          data = getEnablePromptCaching();
        } else if (key === 'promptCacheTTL') {
          data = getPromptCacheTTL();
        } else if (key === 'enableStreaming') {
          data = getEnableStreaming();
        } else if (key === 'jsonMode') {
          data = getJsonMode();
        } else if (key === 'reasoningEffort') {
          data = getReasoningEffort();
        } else {
          // Return all settings as fallback
          data = {
            allKeys: getAllKeys(),
            maxOutputTokens: getMaxOutputTokens(),
            enableWebSearch: getEnableWebSearch(),
            maxWebSearchUses: getMaxWebSearchUses(),
            enableExtendedThinking: getEnableExtendedThinking(),
            enablePromptCaching: getEnablePromptCaching(),
            promptCacheTTL: getPromptCacheTTL(),
            enableStreaming: getEnableStreaming(),
            jsonMode: getJsonMode(),
            reasoningEffort: getReasoningEffort(),
          };
        }
        return { success: true, data };
      }

      case 'chat:send': {
        const { conversationId, content, modelId, systemPrompt, options } = request.payload || {};

        // Parse provider from model ID
        const [providerName, ...modelParts] = modelId.split('/');
        const modelName = modelParts.join('/');

        // Find the provider
        const provider = allProviders.find((p) => p && p.id === providerName);
        if (!provider) {
          throw new Error(`Unknown provider: ${providerName}`);
        }

        // Check if API key exists
        const apiKey = getKey(provider.id as ProviderId);
        if (!apiKey) {
          throw new Error(`Missing API key for provider: ${providerName}`);
        }

        // Get pricing information from ModelService using the raw model ID
        // ModelService stores models with raw IDs like 'gpt-4o', not 'openai/gpt-4o'
        const modelDefinition = modelService.getModelById(modelName);
        if (!modelDefinition) {
          throw new Error(`Model not found: ${modelName} (full ID: ${modelId})`);
        }

        try {
          let result;

          // Build full prompt with system message if provided
          let fullPrompt = content;
          if (systemPrompt) {
            fullPrompt = `${systemPrompt}\n\n${content}`;
          }

          // Create ChatOptions with pricing and other options
          const chatOptions = {
            pricing: modelDefinition.pricing,
            jsonMode: options?.jsonMode,
            jsonSchema: options?.jsonSchema,
            enablePromptCaching: options?.enablePromptCaching,
            cacheTTL: options?.cacheTTL,
            systemPrompt: systemPrompt,
            temperature: options?.temperature,
            abortSignal: options?.abortSignal,
            enableStreaming: options?.enableStreaming,
            onStreamChunk: options?.onStreamChunk,
          };

          // Use enhanced features if available
          if (providerName === 'anthropic' && options?.enablePromptCaching) {
            const messages = [{ role: 'user' as const, content: fullPrompt }];
            result = await (provider as any).chatWithHistory(messages, modelId, chatOptions);
          } else {
            // Standard chat method with pricing - pass the raw model name to the provider
            result = await provider.chat(fullPrompt, modelName, chatOptions);
          }

          // Get the specific model details
          const models = provider.listModels();
          const modelInfo = models.find(
            (m) => modelName.includes(m.id) || m.id.includes(modelName)
          );
          const modelLabel = modelInfo ? modelInfo.name : provider.label;

          // Save user message to database
          if (conversationId) {
            await database.addMessage({
              conversationId,
              role: 'user',
              content: content,
              provider: providerName,
              model: modelId,
              cost: 0,
              tokensIn: result.promptTokens || 0,
              tokensOut: 0,
            });
          }

          // Save assistant response to database
          let savedMessage;
          if (conversationId) {
            savedMessage = await database.addMessage({
              conversationId,
              role: 'assistant',
              content: result.answer,
              provider: providerName,
              model: modelId,
              cost: result.costUSD,
              tokensIn: 0,
              tokensOut: result.answerTokens || 0,
            });
          }

          return {
            success: true,
            data: {
              id: savedMessage?.id || `msg-${Date.now()}`,
              answer: result.answer,
              content: result.answer,
              role: 'assistant',
              promptTokens: result.promptTokens,
              answerTokens: result.answerTokens,
              costUSD: result.costUSD,
              usage: {
                prompt_tokens: result.promptTokens,
                completion_tokens: result.answerTokens,
                cache_creation_input_tokens: (result as any).cacheCreationTokens,
                cache_read_input_tokens: (result as any).cacheReadTokens,
              },
              cost: result.costUSD,
              provider: modelLabel,
              model: modelId,
              timestamp: savedMessage?.timestamp || Date.now(),
            },
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

      case 'project:create': {
        const project = await database.createProject(request.payload || {});
        return { success: true, data: project };
      }

      case 'project:list': {
        const projects = await database.listProjects();
        return { success: true, data: projects };
      }

      case 'project:get': {
        const project = await database.getProject(request.payload?.id);
        return { success: true, data: project };
      }

      case 'project:switch': {
        // Update project last_used timestamp
        const project = await database.updateProject(request.payload?.id, {});
        return { success: true, data: project };
      }

      case 'project:delete': {
        await database.deleteProject(request.payload?.id);
        return { success: true, data: null };
      }

      case 'conversation:create': {
        const conversation = await database.createConversation(request.payload || {});
        return { success: true, data: conversation };
      }

      case 'conversation:list': {
        const conversations = await database.listConversations(request.payload?.projectId);
        return { success: true, data: conversations };
      }

      case 'messages:add': {
        const message = await database.addMessage(request.payload || {});
        return { success: true, data: message };
      }

      case 'messages:list': {
        const messages = await database.listMessages(request.payload?.conversationId);
        return { success: true, data: messages };
      }

      case 'batch:submit': {
        const { projectId, rows } = request.payload || {};

        // Validate that we have rows to process
        if (!rows || rows.length === 0) {
          throw new Error('No rows provided for batch processing');
        }

        // Extract unique providers from all rows and validate API keys
        const providers = new Set<string>();
        for (const row of rows) {
          if (row.model && typeof row.model === 'string') {
            const [provider] = row.model.split('/');
            if (provider) {
              providers.add(provider);
            }
          }
        }

        // Check if API keys exist for all required providers
        const missingKeys: string[] = [];
        for (const provider of providers) {
          const apiKey = getKey(provider as ProviderId);
          if (!apiKey) {
            missingKeys.push(provider);
          }
        }

        // If any API keys are missing, fail immediately with detailed error
        if (missingKeys.length > 0) {
          throw new Error(
            `Missing API keys for providers: ${missingKeys.join(', ')}. ` +
              `Please configure API keys in Settings before running batch jobs.`
          );
        }

        // Create the batch job only after validation passes
        const batchJob = await database.createBatchJob({
          projectId,
          fileName: `batch-${Date.now()}.json`,
          totalRows: rows.length,
          status: 'validated', // Mark as validated, ready for processing
          ...request.payload,
        });

        return { success: true, data: batchJob };
      }

      case 'batch:update-status': {
        const { jobId, ...updates } = request.payload || {};
        const updatedJob = await database.updateBatchJobStatus(jobId, updates);
        return { success: true, data: updatedJob };
      }

      case 'batch:submit-native': {
        const { projectId, rows, providerName } = request.payload || {};

        // Find the provider
        const provider = allProviders.find((p) => p && p.id === providerName);
        if (!provider) {
          throw new Error(`Unknown provider for batch: ${providerName}`);
        }

        // Check if provider supports batch API
        const capabilities = provider.getCapabilities();
        if (!capabilities.supportsBatchAPI) {
          throw new Error(`Provider ${providerName} does not support batch API`);
        }

        // Check if API key exists
        const apiKey = getKey(provider.id as ProviderId);
        if (!apiKey) {
          throw new Error(`Missing API key for provider: ${providerName}`);
        }

        // Submit batch to native provider API
        const batchId = await provider.submitBatch!(rows);

        // Create batch job in database
        const batchJob = await database.createBatchJob({
          projectId,
          fileName: `native-batch-${Date.now()}.json`,
          totalRows: rows.length,
        });

        return {
          success: true,
          data: {
            jobId: batchJob.id,
            nativeBatchId: batchId,
            provider: providerName,
            status: 'submitted',
          },
        };
      }

      case 'batch:get-status': {
        const { nativeBatchId, providerName } = request.payload || {};

        // Find the provider
        const provider = allProviders.find((p) => p && p.id === providerName);
        if (!provider) {
          throw new Error(`Unknown provider for batch: ${providerName}`);
        }

        // Get batch status from provider
        const status = await provider.getBatchStatus!(nativeBatchId);

        return { success: true, data: status };
      }

      case 'batch:get-results': {
        const { nativeBatchId, providerName } = request.payload || {};

        // Find the provider
        const provider = allProviders.find((p) => p && p.id === providerName);
        if (!provider) {
          throw new Error(`Unknown provider for batch: ${providerName}`);
        }

        // Get batch results from provider
        const results = await provider.retrieveBatchResults!(nativeBatchId);

        return { success: true, data: results };
      }

      case 'activity:get': {
        const { projectId, type, limit } = request.payload || {};
        const activity = await database.getActivity(projectId, type, limit || 50);
        return { success: true, data: activity };
      }

      // Legacy handlers still work for backward compatibility
      default:
        return { success: false, error: `Unknown request type: ${request.type}` };
    }
  } catch (error: any) {
    // Only log errors in development mode to avoid EPIPE errors
    if (isDev) {
      console.error(`IPC Error [${request.type}]:`, error);
    }
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
});

// Legacy IPC handlers for backward compatibility with existing functionality
// These will be migrated to unified handler as needed

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

// Legacy settings handlers for backward compatibility
ipcMain.handle('settings:saveApiKey', (_, id: ProviderId, key: string) => {
  setKey(id, key);
});

ipcMain.handle('settings:getAllKeys', () => {
  return getAllKeys();
});

ipcMain.handle('settings:validateKey', (_, id: ProviderId) => {
  return validateKey(id);
});

// Add missing settings handlers that the frontend expects
ipcMain.handle('settings:getMaxOutputTokens', () => {
  return getMaxOutputTokens();
});

ipcMain.handle('settings:setMaxOutputTokens', (_, value: number) => {
  setMaxOutputTokens(value);
});

ipcMain.handle('settings:getEnableWebSearch', () => {
  return getEnableWebSearch();
});

ipcMain.handle('settings:setEnableWebSearch', (_, value: boolean) => {
  setEnableWebSearch(value);
});

ipcMain.handle('settings:getMaxWebSearchUses', () => {
  return getMaxWebSearchUses();
});

ipcMain.handle('settings:setMaxWebSearchUses', (_, value: number) => {
  setMaxWebSearchUses(value);
});

ipcMain.handle('settings:getEnableExtendedThinking', () => {
  return getEnableExtendedThinking();
});

ipcMain.handle('settings:setEnableExtendedThinking', (_, value: boolean) => {
  setEnableExtendedThinking(value);
});

ipcMain.handle('settings:getEnablePromptCaching', () => {
  return getEnablePromptCaching();
});

ipcMain.handle('settings:setEnablePromptCaching', (_, value: boolean) => {
  setEnablePromptCaching(value);
});

ipcMain.handle('settings:getPromptCacheTTL', () => {
  return getPromptCacheTTL();
});

ipcMain.handle('settings:setPromptCacheTTL', (_, value: '5m' | '1h') => {
  setPromptCacheTTL(value);
});

ipcMain.handle('settings:getEnableStreaming', () => {
  return getEnableStreaming();
});

ipcMain.handle('settings:setEnableStreaming', (_, value: boolean) => {
  setEnableStreaming(value);
});

ipcMain.handle('settings:getJsonMode', () => {
  return getJsonMode();
});

ipcMain.handle('settings:setJsonMode', (_, value: boolean) => {
  setJsonMode(value);
});

ipcMain.handle('settings:getReasoningEffort', () => {
  return getReasoningEffort();
});

ipcMain.handle('settings:setReasoningEffort', (_, value: number) => {
  const effortLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
  const effort = effortLevels[value] || 'high';
  setReasoningEffort(effort);
});

// Legacy single-model chat handler for backward compatibility
ipcMain.handle('chat:send', async (_, prompt: string) => {
  const apiKey = store.get('openaiKey');
  if (!apiKey) throw new Error('API key not set');
  return chatWithOpenAI(apiKey, prompt);
});

// Add chat handler to unified IPC - this extends the switch statement
// We'll add this to the unified handler above

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

// Get available models handler - now using ModelService
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
  async (
    _,
    modelId: string,
    prompt: string,
    systemPrompt?: string,
    _temperature?: number,
    jsonOptions?: { jsonMode?: boolean; jsonSchema?: string }
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
      // Get pricing information from ModelService
      // Try multiple ID formats to handle provider prefix mismatches
      let modelDefinition = modelService.getModelById(modelName);
      if (!modelDefinition) {
        modelDefinition = modelService.getModelById(modelId);
      }
      if (!modelDefinition) {
        // Try without potential models/ prefix for Gemini
        const cleanModelName = modelName.replace('models/', '');
        modelDefinition = modelService.getModelById(cleanModelName);
      }

      if (!modelDefinition) {
        console.warn(`[Main] No pricing found for model: ${modelId} (${modelName})`);
        throw new Error(`No pricing information available for model: ${modelId}`);
      }

      // Build full prompt with system message if provided
      let fullPrompt = prompt;
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n${prompt}`;
      }

      // Add JSON instruction if JSON mode is enabled
      if (jsonOptions?.jsonMode && jsonOptions?.jsonSchema) {
        fullPrompt += `\n\nPlease respond with valid JSON matching this schema:\n${jsonOptions.jsonSchema}`;
      } else if (jsonOptions?.jsonMode) {
        fullPrompt += '\n\nPlease respond with valid JSON.';
      }

      // Create chat options with pricing
      // Use JSON mode if requested
      const chatOptions: ChatOptions = {
        pricing: modelDefinition.pricing,
        jsonMode: jsonOptions?.jsonMode || false,
      };

      // Pass the model ID and options to the provider's chat method
      const result = await provider.chat(fullPrompt, modelId, chatOptions);

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

ipcMain.handle(
  'chat:sendToModelBatch',
  async (
    _,
    modelId: string,
    prompt: string,
    systemPrompt?: string,
    _temperature?: number,
    jsonOptions?: { jsonMode?: boolean; jsonSchema?: string }
  ) => {
    const [providerName, ...modelParts] = modelId.split('/');
    const modelName = modelParts.join('/');

    const provider = allProviders.find((p) => p && p.id === providerName);
    if (!provider) throw new Error(`Unknown provider: ${providerName}`);

    const apiKey = getKey(provider.id as ProviderId);
    if (!apiKey) throw new Error(`Missing API key for provider: ${providerName}`);

    try {
      // Get pricing information from ModelService
      // Try multiple ID formats to handle provider prefix mismatches
      let modelDefinition = modelService.getModelById(modelName);
      if (!modelDefinition) {
        modelDefinition = modelService.getModelById(modelId);
      }
      if (!modelDefinition) {
        // Try without potential models/ prefix for Gemini
        const cleanModelName = modelName.replace('models/', '');
        modelDefinition = modelService.getModelById(cleanModelName);
      }

      if (!modelDefinition) {
        console.warn(`[Main] No pricing found for model: ${modelId} (${modelName})`);
        throw new Error(`No pricing information available for model: ${modelId}`);
      }

      let fullPrompt = prompt;
      if (systemPrompt) fullPrompt = `${systemPrompt}\n\n${prompt}`;

      // Add JSON instruction if JSON mode is enabled
      if (jsonOptions?.jsonMode && jsonOptions?.jsonSchema) {
        fullPrompt += `\n\nPlease respond with valid JSON matching this schema:\n${jsonOptions.jsonSchema}`;
      } else if (jsonOptions?.jsonMode) {
        fullPrompt += '\n\nPlease respond with valid JSON.';
      }

      // Create chat options with pricing
      // Use JSON mode if requested
      const chatOptions: ChatOptions = {
        pricing: modelDefinition.pricing,
        jsonMode: jsonOptions?.jsonMode || false,
      };

      const result = await provider.chat(fullPrompt, modelId, chatOptions);

      const modelInfo = provider
        .listModels()
        .find((m) => modelId.includes(m.id) || m.id.includes(modelName));
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
      if (error.status === 401 || error.status === 403) {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          win.webContents.send('settings:invalidKey', provider.id);
        }
      }
      throw error;
    }
  }
);

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
