import { ipcMain } from 'electron';
import { RequestSchema, ResponseSchema, IpcRequest, IpcResponse } from './router';
import { ZodError } from 'zod';

// Import existing services
import { ModelService } from '../services/ModelService';
import { Database } from '../db/mockDatabase';
import { 
  getAllKeys, setKey, getKey, validateKey as _validateKey, setMaxOutputTokens, getMaxOutputTokens,
  setEnableWebSearch, getEnableWebSearch, setMaxWebSearchUses, getMaxWebSearchUses,
  setEnableExtendedThinking, getEnableExtendedThinking, setEnablePromptCaching, 
  getEnablePromptCaching, setPromptCacheTTL, getPromptCacheTTL, setEnableStreaming,
  getEnableStreaming, getJsonMode, setJsonMode, getReasoningEffort, setReasoningEffort
} from '../settings';
import { allProviders, ProviderId } from '../providers';
import { ChatOptions } from '../providers/base';
import { get_encoding } from '@dqbd/tiktoken';
import { countTokens, parseModelId } from '../coreLLM';
import { append as appendHistory } from '../history/append';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { shell, BrowserWindow } from 'electron';

// Initialize services
const modelService = new ModelService();
const database = new Database();
const _tokenEncoder = get_encoding('cl100k_base');

// Router implementation
export class IpcRouter {
  constructor() {
    this.setupRouter();
  }

  private setupRouter(): void {
    ipcMain.handle('app:request', async (event, rawRequest): Promise<IpcResponse> => {
      try {
        // Validate request schema
        const request = RequestSchema.parse(rawRequest);
        
        // Route to appropriate handler
        const response = await this.handleRequest(request);
        
        // Validate response schema
        return ResponseSchema.parse(response);
      } catch (error: any) {
        if (error instanceof ZodError) {
          return {
            success: false,
            error: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          };
        }
        
        return {
          success: false,
          error: error.message || 'Unknown error occurred',
        };
      }
    });
  }

  private async handleRequest(request: IpcRequest): Promise<IpcResponse> {
    switch (request.type) {
      case 'models:get-all':
        return this.handleModelsGetAll();
      
      case 'settings:save':
        return this.handleSettingsSave(request.payload);
      
      case 'settings:load':
        return this.handleSettingsLoad(request.payload);
      
      case 'chat:send':
        return this.handleChatSend(request.payload);
      
      case 'project:create':
        return this.handleProjectCreate(request.payload);
      
      case 'project:list':
        return this.handleProjectList();
      
      case 'project:get':
        return this.handleProjectGet(request.payload);
      
      case 'project:switch':
        return this.handleProjectSwitch(request.payload);
      
      case 'project:delete':
        return this.handleProjectDelete(request.payload);
      
      case 'conversation:create':
        return this.handleConversationCreate(request.payload);
      
      case 'conversation:list':
        return this.handleConversationList(request.payload);
      
      case 'messages:add':
        return this.handleMessagesAdd(request.payload);
      
      case 'messages:list':
        return this.handleMessagesList(request.payload);
      
      case 'batch:submit':
        return this.handleBatchSubmit(request.payload);
      
      case 'batch:update-status':
        return this.handleBatchUpdateStatus(request.payload);
      
      case 'batch:submit-native':
        return this.handleBatchSubmitNative(request.payload);
      
      case 'batch:get-status':
        return this.handleBatchGetStatus(request.payload);
      
      case 'batch:get-results':
        return this.handleBatchGetResults(request.payload);
      
      case 'activity:get':
        return this.handleActivityGet(request.payload);
      
      case 'utils:count-tokens':
      case 'tokens:count':
        return this.handleCountTokens(request.payload);
      
      case 'jobqueue:save-state':
        return this.handleJobQueueSaveState(request.payload);
      
      case 'jobqueue:load-state':
        return this.handleJobQueueLoadState(request.payload);
      
      case 'jobqueue:clear-state':
        return this.handleJobQueueClearState(request.payload);
      
      case 'jobqueue:get-directory':
        return this.handleJobQueueGetDirectory();
      
      case 'jobqueue:list-files':
        return this.handleJobQueueListFiles(request.payload);
      
      case 'history:log':
        return this.handleHistoryLog(request.payload);
      
      case 'history:open-folder':
        return this.handleHistoryOpenFolder(request.payload);
      
      case 'history:read':
        return this.handleHistoryRead(request.payload);
      
      default:
        return {
          success: false,
          error: `Unknown request type: ${(request as any).type}`,
        };
    }
  }

  // Handler implementations
  private async handleModelsGetAll(): Promise<IpcResponse> {
    return { success: true, data: modelService.getAllModels() };
  }

  private async handleSettingsSave(payload: any): Promise<IpcResponse> {
    const { key, value, provider } = payload;
    
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

  private async handleSettingsLoad(payload: any): Promise<IpcResponse> {
    const { key, provider } = payload;
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

  private async handleChatSend(payload: any): Promise<IpcResponse> {
    const { conversationId, content, modelId, systemPrompt, options } = payload;

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

    // Get pricing information from ModelService
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
      const chatOptions: ChatOptions = {
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
        // Standard chat method with pricing
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

  // Project handlers
  private async handleProjectCreate(payload: any): Promise<IpcResponse> {
    const project = await database.createProject(payload);
    return { success: true, data: project };
  }

  private async handleProjectList(): Promise<IpcResponse> {
    const projects = await database.listProjects();
    return { success: true, data: projects };
  }

  private async handleProjectGet(payload: any): Promise<IpcResponse> {
    const project = await database.getProject(payload.id);
    return { success: true, data: project };
  }

  private async handleProjectSwitch(payload: any): Promise<IpcResponse> {
    const project = await database.updateProject(payload.id, {});
    return { success: true, data: project };
  }

  private async handleProjectDelete(payload: any): Promise<IpcResponse> {
    await database.deleteProject(payload.id);
    return { success: true, data: null };
  }

  // Conversation handlers
  private async handleConversationCreate(payload: any): Promise<IpcResponse> {
    const conversation = await database.createConversation(payload);
    return { success: true, data: conversation };
  }

  private async handleConversationList(payload: any): Promise<IpcResponse> {
    const conversations = await database.listConversations(payload.projectId);
    return { success: true, data: conversations };
  }

  // Message handlers
  private async handleMessagesAdd(payload: any): Promise<IpcResponse> {
    const message = await database.addMessage(payload);
    return { success: true, data: message };
  }

  private async handleMessagesList(payload: any): Promise<IpcResponse> {
    const messages = await database.listMessages(payload.conversationId);
    return { success: true, data: messages };
  }

  // Batch handlers
  private async handleBatchSubmit(payload: any): Promise<IpcResponse> {
    const { projectId, rows } = payload;

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
      ...payload,
    });

    return { success: true, data: batchJob };
  }

  private async handleBatchUpdateStatus(payload: any): Promise<IpcResponse> {
    const { jobId, ...updates } = payload;
    const updatedJob = await database.updateBatchJobStatus(jobId, updates);
    return { success: true, data: updatedJob };
  }

  private async handleBatchSubmitNative(payload: any): Promise<IpcResponse> {
    const { projectId, rows, providerName } = payload;

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

  private async handleBatchGetStatus(payload: any): Promise<IpcResponse> {
    const { nativeBatchId, providerName } = payload;

    // Find the provider
    const provider = allProviders.find((p) => p && p.id === providerName);
    if (!provider) {
      throw new Error(`Unknown provider for batch: ${providerName}`);
    }

    // Get batch status from provider
    const status = await provider.getBatchStatus!(nativeBatchId);

    return { success: true, data: status };
  }

  private async handleBatchGetResults(payload: any): Promise<IpcResponse> {
    const { nativeBatchId, providerName } = payload;

    // Find the provider
    const provider = allProviders.find((p) => p && p.id === providerName);
    if (!provider) {
      throw new Error(`Unknown provider for batch: ${providerName}`);
    }

    // Get batch results from provider
    const results = await provider.retrieveBatchResults!(nativeBatchId);

    return { success: true, data: results };
  }

  // Activity handler
  private async handleActivityGet(payload: any): Promise<IpcResponse> {
    const { projectId, type, limit } = payload;
    const activity = await database.getActivity(projectId, type, limit || 50);
    return { success: true, data: activity };
  }

  // Utility handlers
  private async handleCountTokens(payload: any): Promise<IpcResponse> {
    const { text, modelId } = payload;
    
    try {
      // Use centralized token counting utility
      const { provider } = parseModelId(modelId || 'openai/gpt-4o');
      const count = await countTokens(text, provider, modelId);
      return { success: true, data: count };
    } catch (error) {
      console.error('Error counting tokens:', error);
      // Fallback: rough estimate of 1 token per 4 characters
      return { success: true, data: Math.ceil(text.length / 4) };
    }
  }

  // Job Queue handlers (Legacy support)
  private async handleJobQueueSaveState(payload: any): Promise<IpcResponse> {
    const { batchId, state } = payload;
    const stateDir = path.join(os.homedir(), '.abai', 'jobqueue');
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    const statePath = path.join(stateDir, `${batchId}.jobqueue`);
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    
    return { success: true, data: null };
  }

  private async handleJobQueueLoadState(payload: any): Promise<IpcResponse> {
    const { batchId } = payload;
    const stateDir = path.join(os.homedir(), '.abai', 'jobqueue');
    const statePath = path.join(stateDir, `${batchId}.jobqueue`);

    if (!fs.existsSync(statePath)) {
      return { success: true, data: null };
    }

    const stateData = fs.readFileSync(statePath, 'utf-8');
    return { success: true, data: JSON.parse(stateData) };
  }

  private async handleJobQueueClearState(payload: any): Promise<IpcResponse> {
    const { batchId } = payload;
    const stateDir = path.join(os.homedir(), '.abai', 'jobqueue');
    const statePath = path.join(stateDir, `${batchId}.jobqueue`);

    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
    
    return { success: true, data: null };
  }

  private async handleJobQueueGetDirectory(): Promise<IpcResponse> {
    return { success: true, data: path.join(os.homedir(), '.abai', 'jobqueue') };
  }

  private async handleJobQueueListFiles(payload: any): Promise<IpcResponse> {
    const { directory } = payload;
    if (!fs.existsSync(directory)) {
      return { success: true, data: [] };
    }
    return { success: true, data: fs.readdirSync(directory) };
  }

  // History handlers (Legacy support)
  private async handleHistoryLog(payload: any): Promise<IpcResponse> {
    const { project, row } = payload;
    try {
      appendHistory(project, row);
      return { success: true, data: null };
    } catch (error) {
      console.error('Error logging history:', error);
      throw error;
    }
  }

  private async handleHistoryOpenFolder(payload: any): Promise<IpcResponse> {
    const { project } = payload;
    try {
      const historyDir = path.join(os.homedir(), '.abai', 'history');
      await shell.openPath(historyDir);
      return { success: true, data: null };
    } catch (error) {
      console.error('Error opening history folder:', error);
      throw error;
    }
  }

  private async handleHistoryRead(payload: any): Promise<IpcResponse> {
    const { project } = payload;
    try {
      const historyDir = path.join(os.homedir(), '.abai', 'history');
      const historyFile = path.join(historyDir, `${project}.jsonl`);

      if (!fs.existsSync(historyFile)) {
        return { success: true, data: [] };
      }

      const content = fs.readFileSync(historyFile, 'utf-8');
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.trim());

      const data = lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch (error) {
            console.error('Error parsing history line:', line, error);
            return null;
          }
        })
        .filter((entry) => entry !== null);

      return { success: true, data };
    } catch (error) {
      console.error('Error reading history file:', error);
      return { success: true, data: [] };
    }
  }
}

// Export singleton instance
export const ipcRouter = new IpcRouter();