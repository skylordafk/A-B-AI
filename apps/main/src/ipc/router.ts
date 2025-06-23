import { z } from 'zod';
import type { ProviderId as _ProviderId } from '../providers';

// Base request/response types
export const BaseRequestSchema = z.object({
  type: z.string(),
  payload: z.any().optional(),
});

export const BaseResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

// Shared schemas for common types
const ModelIdSchema = z.string().describe('Model ID in format provider/model-name');
const ProjectIdSchema = z.string().uuid();
const ConversationIdSchema = z.string().uuid();
const ProviderIdSchema = z.enum(['openai', 'anthropic', 'gemini', 'grok']);

// Models
export const ModelsGetAllRequestSchema = z.object({
  type: z.literal('models:get-all'),
  payload: z.undefined(),
});

export const ModelsGetAllResponseSchema = BaseResponseSchema.extend({
  data: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        provider: z.string(),
        pricing: z.object({
          input: z.number(),
          output: z.number(),
        }),
      })
    )
    .optional(),
});

// Settings
export const SettingsSaveRequestSchema = z.object({
  type: z.literal('settings:save'),
  payload: z.object({
    key: z.enum([
      'apiKey',
      'maxOutputTokens',
      'enableWebSearch',
      'maxWebSearchUses',
      'enableExtendedThinking',
      'enablePromptCaching',
      'promptCacheTTL',
      'enableStreaming',
      'jsonMode',
      'reasoningEffort',
    ]),
    value: z.any(),
    provider: ProviderIdSchema.optional(),
  }),
});

export const SettingsLoadRequestSchema = z.object({
  type: z.literal('settings:load'),
  payload: z.object({
    key: z.enum([
      'apiKey',
      'allKeys',
      'maxOutputTokens',
      'enableWebSearch',
      'maxWebSearchUses',
      'enableExtendedThinking',
      'enablePromptCaching',
      'promptCacheTTL',
      'enableStreaming',
      'jsonMode',
      'reasoningEffort',
    ]),
    provider: ProviderIdSchema.optional(),
  }),
});

export const SettingsResponseSchema = BaseResponseSchema.extend({
  data: z.any().optional(),
});

// Chat
export const ChatSendRequestSchema = z.object({
  type: z.literal('chat:send'),
  payload: z.object({
    conversationId: ConversationIdSchema.optional(),
    content: z.string(),
    modelId: ModelIdSchema,
    systemPrompt: z.string().optional(),
    options: z
      .object({
        temperature: z.number().min(0).max(2).optional(),
        jsonMode: z.boolean().optional(),
        jsonSchema: z.string().optional(),
        enablePromptCaching: z.boolean().optional(),
        cacheTTL: z.enum(['5m', '1h']).optional(),
        enableStreaming: z.boolean().optional(),
        // NOTE: onStreamChunk and abortSignal removed - functions and DOM objects can't be serialized over IPC
      })
      .optional(),
  }),
});

export const ChatResponseSchema = BaseResponseSchema.extend({
  data: z
    .object({
      id: z.string(),
      answer: z.string(),
      content: z.string(),
      role: z.literal('assistant'),
      promptTokens: z.number(),
      answerTokens: z.number(),
      costUSD: z.number(),
      usage: z.object({
        prompt_tokens: z.number(),
        completion_tokens: z.number(),
        cache_creation_input_tokens: z.number().optional(),
        cache_read_input_tokens: z.number().optional(),
      }),
      cost: z.number(),
      provider: z.string(),
      model: z.string(),
      timestamp: z.number(),
    })
    .optional(),
});

// Projects
export const ProjectCreateRequestSchema = z.object({
  type: z.literal('project:create'),
  payload: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
});

export const ProjectListRequestSchema = z.object({
  type: z.literal('project:list'),
  payload: z.undefined(),
});

export const ProjectGetRequestSchema = z.object({
  type: z.literal('project:get'),
  payload: z.object({
    id: ProjectIdSchema,
  }),
});

export const ProjectSwitchRequestSchema = z.object({
  type: z.literal('project:switch'),
  payload: z.object({
    id: ProjectIdSchema,
  }),
});

export const ProjectDeleteRequestSchema = z.object({
  type: z.literal('project:delete'),
  payload: z.object({
    id: ProjectIdSchema,
  }),
});

export const ProjectResponseSchema = BaseResponseSchema.extend({
  data: z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      created_at: z.string(),
      last_used: z.string(),
    })
    .or(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
          created_at: z.string(),
          last_used: z.string(),
        })
      )
    )
    .optional(),
});

// Conversations
export const ConversationCreateRequestSchema = z.object({
  type: z.literal('conversation:create'),
  payload: z.object({
    projectId: ProjectIdSchema,
    name: z.string().optional(),
  }),
});

export const ConversationListRequestSchema = z.object({
  type: z.literal('conversation:list'),
  payload: z.object({
    projectId: ProjectIdSchema,
  }),
});

export const ConversationResponseSchema = BaseResponseSchema.extend({
  data: z
    .object({
      id: z.string(),
      projectId: z.string(),
      name: z.string().optional(),
      created_at: z.string(),
      updated_at: z.string(),
    })
    .or(
      z.array(
        z.object({
          id: z.string(),
          projectId: z.string(),
          name: z.string().optional(),
          created_at: z.string(),
          updated_at: z.string(),
        })
      )
    )
    .optional(),
});

// Messages
export const MessagesAddRequestSchema = z.object({
  type: z.literal('messages:add'),
  payload: z.object({
    conversationId: ConversationIdSchema,
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    provider: z.string().optional(),
    model: z.string().optional(),
    cost: z.number().optional(),
    tokensIn: z.number().optional(),
    tokensOut: z.number().optional(),
  }),
});

export const MessagesListRequestSchema = z.object({
  type: z.literal('messages:list'),
  payload: z.object({
    conversationId: ConversationIdSchema,
  }),
});

export const MessagesResponseSchema = BaseResponseSchema.extend({
  data: z
    .object({
      id: z.string(),
      conversationId: z.string(),
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      provider: z.string().optional(),
      model: z.string().optional(),
      cost: z.number().optional(),
      tokensIn: z.number().optional(),
      tokensOut: z.number().optional(),
      timestamp: z.number(),
    })
    .or(
      z.array(
        z.object({
          id: z.string(),
          conversationId: z.string(),
          role: z.enum(['user', 'assistant']),
          content: z.string(),
          provider: z.string().optional(),
          model: z.string().optional(),
          cost: z.number().optional(),
          tokensIn: z.number().optional(),
          tokensOut: z.number().optional(),
          timestamp: z.number(),
        })
      )
    )
    .optional(),
});

// Batch Processing
export const BatchSubmitRequestSchema = z.object({
  type: z.literal('batch:submit'),
  payload: z.object({
    projectId: ProjectIdSchema,
    rows: z.array(
      z.object({
        id: z.string(),
        prompt: z.string(),
        model: ModelIdSchema,
        systemPrompt: z.string().optional(),
        jsonMode: z.boolean().optional(),
        jsonSchema: z.string().optional(),
      })
    ),
    fileName: z.string().optional(),
  }),
});

export const BatchUpdateStatusRequestSchema = z.object({
  type: z.literal('batch:update-status'),
  payload: z.object({
    jobId: z.string(),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
    completedRows: z.number().optional(),
    totalRows: z.number().optional(),
    error: z.string().optional(),
  }),
});

export const BatchSubmitNativeRequestSchema = z.object({
  type: z.literal('batch:submit-native'),
  payload: z.object({
    projectId: ProjectIdSchema,
    rows: z.array(z.any()),
    providerName: ProviderIdSchema,
  }),
});

export const BatchGetStatusRequestSchema = z.object({
  type: z.literal('batch:get-status'),
  payload: z.object({
    nativeBatchId: z.string(),
    providerName: ProviderIdSchema,
  }),
});

export const BatchGetResultsRequestSchema = z.object({
  type: z.literal('batch:get-results'),
  payload: z.object({
    nativeBatchId: z.string(),
    providerName: ProviderIdSchema,
  }),
});

export const BatchResponseSchema = BaseResponseSchema.extend({
  data: z.any().optional(),
});

// Activity
export const ActivityGetRequestSchema = z.object({
  type: z.literal('activity:get'),
  payload: z.object({
    projectId: ProjectIdSchema,
    type: z.enum(['chat', 'batch', 'all']).optional(),
    limit: z.number().optional(),
  }),
});

export const ActivityResponseSchema = BaseResponseSchema.extend({
  data: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        description: z.string(),
        timestamp: z.number(),
        metadata: z.any().optional(),
      })
    )
    .optional(),
});

// Utilities
export const CountTokensRequestSchema = z.object({
  type: z.literal('utils:count-tokens'),
  payload: z.object({
    text: z.string(),
    modelId: ModelIdSchema.optional(),
  }),
});

export const TokensCountRequestSchema = z.object({
  type: z.literal('tokens:count'),
  payload: z.object({
    text: z.string(),
    modelId: ModelIdSchema.optional(),
  }),
});

export const CountTokensResponseSchema = BaseResponseSchema.extend({
  data: z.number().optional(),
});

// Job Queue (Legacy Support)
export const JobQueueSaveStateRequestSchema = z.object({
  type: z.literal('jobqueue:save-state'),
  payload: z.object({
    batchId: z.string(),
    state: z.any(),
  }),
});

export const JobQueueLoadStateRequestSchema = z.object({
  type: z.literal('jobqueue:load-state'),
  payload: z.object({
    batchId: z.string(),
  }),
});

export const JobQueueClearStateRequestSchema = z.object({
  type: z.literal('jobqueue:clear-state'),
  payload: z.object({
    batchId: z.string(),
  }),
});

export const JobQueueGetDirectoryRequestSchema = z.object({
  type: z.literal('jobqueue:get-directory'),
  payload: z.undefined(),
});

export const JobQueueListFilesRequestSchema = z.object({
  type: z.literal('jobqueue:list-files'),
  payload: z.object({
    directory: z.string(),
  }),
});

export const JobQueueResponseSchema = BaseResponseSchema.extend({
  data: z.any().optional(),
});

// History (Legacy Support)
export const HistoryLogRequestSchema = z.object({
  type: z.literal('history:log'),
  payload: z.object({
    project: z.string(),
    row: z.record(z.any()),
  }),
});

export const HistoryOpenFolderRequestSchema = z.object({
  type: z.literal('history:open-folder'),
  payload: z.object({
    project: z.string(),
  }),
});

export const HistoryReadRequestSchema = z.object({
  type: z.literal('history:read'),
  payload: z.object({
    project: z.string(),
  }),
});

export const HistoryResponseSchema = BaseResponseSchema.extend({
  data: z.any().optional(),
});

// Union of all request types
export const RequestSchema = z.discriminatedUnion('type', [
  ModelsGetAllRequestSchema,
  SettingsSaveRequestSchema,
  SettingsLoadRequestSchema,
  ChatSendRequestSchema,
  ProjectCreateRequestSchema,
  ProjectListRequestSchema,
  ProjectGetRequestSchema,
  ProjectSwitchRequestSchema,
  ProjectDeleteRequestSchema,
  ConversationCreateRequestSchema,
  ConversationListRequestSchema,
  MessagesAddRequestSchema,
  MessagesListRequestSchema,
  BatchSubmitRequestSchema,
  BatchUpdateStatusRequestSchema,
  BatchSubmitNativeRequestSchema,
  BatchGetStatusRequestSchema,
  BatchGetResultsRequestSchema,
  ActivityGetRequestSchema,
  CountTokensRequestSchema,
  TokensCountRequestSchema,
  JobQueueSaveStateRequestSchema,
  JobQueueLoadStateRequestSchema,
  JobQueueClearStateRequestSchema,
  JobQueueGetDirectoryRequestSchema,
  JobQueueListFilesRequestSchema,
  HistoryLogRequestSchema,
  HistoryOpenFolderRequestSchema,
  HistoryReadRequestSchema,
]);

// Union of all response types
export const ResponseSchema = z.union([
  ModelsGetAllResponseSchema,
  SettingsResponseSchema,
  ChatResponseSchema,
  ProjectResponseSchema,
  ConversationResponseSchema,
  MessagesResponseSchema,
  BatchResponseSchema,
  ActivityResponseSchema,
  CountTokensResponseSchema,
  JobQueueResponseSchema,
  HistoryResponseSchema,
]);

// Export types for TypeScript
export type IpcRequest = z.infer<typeof RequestSchema>;
export type IpcResponse = z.infer<typeof ResponseSchema>;

// Route mapping for handlers
export const ROUTE_HANDLERS = {
  'models:get-all': 'handleModelsGetAll',
  'settings:save': 'handleSettingsSave',
  'settings:load': 'handleSettingsLoad',
  'chat:send': 'handleChatSend',
  'project:create': 'handleProjectCreate',
  'project:list': 'handleProjectList',
  'project:get': 'handleProjectGet',
  'project:switch': 'handleProjectSwitch',
  'project:delete': 'handleProjectDelete',
  'conversation:create': 'handleConversationCreate',
  'conversation:list': 'handleConversationList',
  'messages:add': 'handleMessagesAdd',
  'messages:list': 'handleMessagesList',
  'batch:submit': 'handleBatchSubmit',
  'batch:update-status': 'handleBatchUpdateStatus',
  'batch:submit-native': 'handleBatchSubmitNative',
  'batch:get-status': 'handleBatchGetStatus',
  'batch:get-results': 'handleBatchGetResults',
  'activity:get': 'handleActivityGet',
  'utils:count-tokens': 'handleCountTokens',
  'jobqueue:save-state': 'handleJobQueueSaveState',
  'jobqueue:load-state': 'handleJobQueueLoadState',
  'jobqueue:clear-state': 'handleJobQueueClearState',
  'jobqueue:get-directory': 'handleJobQueueGetDirectory',
  'jobqueue:list-files': 'handleJobQueueListFiles',
  'history:log': 'handleHistoryLog',
  'history:open-folder': 'handleHistoryOpenFolder',
  'history:read': 'handleHistoryRead',
} as const;
