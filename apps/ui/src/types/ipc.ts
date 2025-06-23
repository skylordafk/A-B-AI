// Generated types from IPC router schema
// This file contains all the request/response types for IPC communication

export interface BaseRequest {
  type: string;
  payload?: any;
}

export interface BaseResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Models
export interface ModelsGetAllRequest {
  type: 'models:get-all';
  payload?: undefined;
}

export interface ModelsGetAllResponse extends BaseResponse {
  data?: Array<{
    id: string;
    name: string;
    provider: string;
    pricing: {
      input: number;
      output: number;
    };
  }>;
}

// Settings
export interface SettingsSaveRequest {
  type: 'settings:save';
  payload: {
    key: 'apiKey' | 'maxOutputTokens' | 'enableWebSearch' | 'maxWebSearchUses' | 
         'enableExtendedThinking' | 'enablePromptCaching' | 'promptCacheTTL' | 
         'enableStreaming' | 'jsonMode' | 'reasoningEffort';
    value: any;
    provider?: 'openai' | 'anthropic' | 'gemini' | 'grok';
  };
}

export interface SettingsLoadRequest {
  type: 'settings:load';
  payload: {
    key: 'apiKey' | 'allKeys' | 'maxOutputTokens' | 'enableWebSearch' | 'maxWebSearchUses' |
         'enableExtendedThinking' | 'enablePromptCaching' | 'promptCacheTTL' |
         'enableStreaming' | 'jsonMode' | 'reasoningEffort';
    provider?: 'openai' | 'anthropic' | 'gemini' | 'grok';
  };
}

export interface SettingsResponse extends BaseResponse {
  data?: any;
}

// Chat
export interface ChatSendRequest {
  type: 'chat:send';
  payload: {
    conversationId?: string;
    content: string;
    modelId: string;
    systemPrompt?: string;
    options?: {
      temperature?: number;
      jsonMode?: boolean;
      jsonSchema?: string;
      enablePromptCaching?: boolean;
      cacheTTL?: '5m' | '1h';
      enableStreaming?: boolean;
      onStreamChunk?: (chunk: string) => void;
      abortSignal?: any;
    };
  };
}

export interface ChatResponse extends BaseResponse {
  data?: {
    id: string;
    answer: string;
    content: string;
    role: 'assistant';
    promptTokens: number;
    answerTokens: number;
    costUSD: number;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    cost: number;
    provider: string;
    model: string;
    timestamp: number;
  };
}

// Projects
export interface ProjectCreateRequest {
  type: 'project:create';
  payload: {
    name: string;
    description?: string;
  };
}

export interface ProjectListRequest {
  type: 'project:list';
  payload?: undefined;
}

export interface ProjectGetRequest {
  type: 'project:get';
  payload: {
    id: string;
  };
}

export interface ProjectSwitchRequest {
  type: 'project:switch';
  payload: {
    id: string;
  };
}

export interface ProjectDeleteRequest {
  type: 'project:delete';
  payload: {
    id: string;
  };
}

export interface ProjectResponse extends BaseResponse {
  data?: {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    last_used: string;
  } | Array<{
    id: string;
    name: string;
    description?: string;
    created_at: string;
    last_used: string;
  }>;
}

// Conversations
export interface ConversationCreateRequest {
  type: 'conversation:create';
  payload: {
    projectId: string;
    name?: string;
  };
}

export interface ConversationListRequest {
  type: 'conversation:list';
  payload: {
    projectId: string;
  };
}

export interface ConversationResponse extends BaseResponse {
  data?: {
    id: string;
    projectId: string;
    name?: string;
    created_at: string;
    updated_at: string;
  } | Array<{
    id: string;
    projectId: string;
    name?: string;
    created_at: string;
    updated_at: string;
  }>;
}

// Messages
export interface MessagesAddRequest {
  type: 'messages:add';
  payload: {
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    provider?: string;
    model?: string;
    cost?: number;
    tokensIn?: number;
    tokensOut?: number;
  };
}

export interface MessagesListRequest {
  type: 'messages:list';
  payload: {
    conversationId: string;
  };
}

export interface MessagesResponse extends BaseResponse {
  data?: {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    provider?: string;
    model?: string;
    cost?: number;
    tokensIn?: number;
    tokensOut?: number;
    timestamp: number;
  } | Array<{
    id: string;
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    provider?: string;
    model?: string;
    cost?: number;
    tokensIn?: number;
    tokensOut?: number;
    timestamp: number;
  }>;
}

// Batch Processing
export interface BatchSubmitRequest {
  type: 'batch:submit';
  payload: {
    projectId: string;
    rows: Array<{
      id: string;
      prompt: string;
      model: string;
      systemPrompt?: string;
      jsonMode?: boolean;
      jsonSchema?: string;
    }>;
    fileName?: string;
  };
}

export interface BatchUpdateStatusRequest {
  type: 'batch:update-status';
  payload: {
    jobId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    completedRows?: number;
    totalRows?: number;
    error?: string;
  };
}

export interface BatchSubmitNativeRequest {
  type: 'batch:submit-native';
  payload: {
    projectId: string;
    rows: Array<any>;
    providerName: 'openai' | 'anthropic' | 'gemini' | 'grok';
  };
}

export interface BatchGetStatusRequest {
  type: 'batch:get-status';
  payload: {
    nativeBatchId: string;
    providerName: 'openai' | 'anthropic' | 'gemini' | 'grok';
  };
}

export interface BatchGetResultsRequest {
  type: 'batch:get-results';
  payload: {
    nativeBatchId: string;
    providerName: 'openai' | 'anthropic' | 'gemini' | 'grok';
  };
}

export interface BatchResponse extends BaseResponse {
  data?: any;
}

// Activity
export interface ActivityGetRequest {
  type: 'activity:get';
  payload: {
    projectId: string;
    type?: 'chat' | 'batch' | 'all';
    limit?: number;
  };
}

export interface ActivityResponse extends BaseResponse {
  data?: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: number;
    metadata?: any;
  }>;
}

// Utilities
export interface CountTokensRequest {
  type: 'utils:count-tokens';
  payload: {
    text: string;
    modelId?: string;
  };
}

export interface CountTokensResponse extends BaseResponse {
  data?: number;
}

// Job Queue (Legacy Support)
export interface JobQueueSaveStateRequest {
  type: 'jobqueue:save-state';
  payload: {
    batchId: string;
    state: any;
  };
}

export interface JobQueueLoadStateRequest {
  type: 'jobqueue:load-state';
  payload: {
    batchId: string;
  };
}

export interface JobQueueClearStateRequest {
  type: 'jobqueue:clear-state';
  payload: {
    batchId: string;
  };
}

export interface JobQueueGetDirectoryRequest {
  type: 'jobqueue:get-directory';
  payload?: undefined;
}

export interface JobQueueListFilesRequest {
  type: 'jobqueue:list-files';
  payload: {
    directory: string;
  };
}

export interface JobQueueResponse extends BaseResponse {
  data?: any;
}

// History (Legacy Support)
export interface HistoryLogRequest {
  type: 'history:log';
  payload: {
    project: string;
    row: Record<string, any>;
  };
}

export interface HistoryOpenFolderRequest {
  type: 'history:open-folder';
  payload: {
    project: string;
  };
}

export interface HistoryReadRequest {
  type: 'history:read';
  payload: {
    project: string;
  };
}

export interface HistoryResponse extends BaseResponse {
  data?: any;
}

// Union types for all requests and responses
export type IpcRequest = 
  | ModelsGetAllRequest
  | SettingsSaveRequest
  | SettingsLoadRequest
  | ChatSendRequest
  | ProjectCreateRequest
  | ProjectListRequest
  | ProjectGetRequest
  | ProjectSwitchRequest
  | ProjectDeleteRequest
  | ConversationCreateRequest
  | ConversationListRequest
  | MessagesAddRequest
  | MessagesListRequest
  | BatchSubmitRequest
  | BatchUpdateStatusRequest
  | BatchSubmitNativeRequest
  | BatchGetStatusRequest
  | BatchGetResultsRequest
  | ActivityGetRequest
  | CountTokensRequest
  | JobQueueSaveStateRequest
  | JobQueueLoadStateRequest
  | JobQueueClearStateRequest
  | JobQueueGetDirectoryRequest
  | JobQueueListFilesRequest
  | HistoryLogRequest
  | HistoryOpenFolderRequest
  | HistoryReadRequest;

export type IpcResponse = 
  | ModelsGetAllResponse
  | SettingsResponse
  | ChatResponse
  | ProjectResponse
  | ConversationResponse
  | MessagesResponse
  | BatchResponse
  | ActivityResponse
  | CountTokensResponse
  | JobQueueResponse
  | HistoryResponse;