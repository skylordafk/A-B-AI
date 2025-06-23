import { RequestType, AppRequest, AppResponse } from '../../../../shared/types';

export { RequestType, AppRequest, AppResponse };

export interface IPCHandler {
  handle(request: AppRequest): Promise<AppResponse>;
}

export interface DatabaseRequest extends AppRequest {
  payload: {
    id?: string;
    data?: any;
    filters?: Record<string, any>;
  };
}

export interface ChatRequest extends AppRequest {
  payload: {
    conversationId: string;
    content: string;
    modelId: string;
    systemPrompt?: string;
    temperature?: number;
    options?: {
      enablePromptCaching?: boolean;
      cacheTTL?: '5m' | '1h';
      jsonMode?: boolean;
      jsonSchema?: object;
    };
  };
}

export interface ProjectRequest extends AppRequest {
  payload: {
    id?: string;
    name?: string;
    description?: string;
  };
}

export interface SettingsRequest extends AppRequest {
  payload: {
    key?: string;
    value?: any;
    provider?: string;
  };
}

export type IpcRequestType =
  | 'models:get-all'
  | 'settings:save'
  | 'settings:load'
  | 'chat:send'
  | 'project:create'
  | 'project:list'
  | 'project:get'
  | 'project:switch'
  | 'project:delete'
  | 'conversation:create'
  | 'conversation:list'
  | 'messages:add'
  | 'messages:list'
  | 'batch:submit'
  | 'batch:update-status'
  | 'batch:submit-native'
  | 'batch:get-status'
  | 'batch:get-results'
  | 'activity:get'
  | 'utils:count-tokens' // Legacy, to be merged
  | 'tokens:count' // New standardized type
  | 'jobqueue:save-state'
  | 'jobqueue:load-state'
  | 'jobqueue:clear-state'
  | 'jobqueue:get-directory'
  | 'jobqueue:list-files'
  | 'history:log'
  | 'history:open-folder'
  | 'history:read'
  | 'data:load-pricing';
