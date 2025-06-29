export interface ModelDefinition {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'grok' | 'gemini';
  description: string;
  contextSize: number;
  pricing: {
    prompt: number;
    completion: number;
    cacheWrite5m?: number;
    cacheWrite1h?: number;
    cacheRead?: number;
  };
  features: ('web_search' | 'extended_thinking' | 'prompt_caching' | 'json_mode')[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export type RequestType =
  | 'models:get-all'
  | 'chat:send'
  | 'chat:send-structured'
  | 'settings:save'
  | 'settings:load'
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
  | 'batch:submit-native'
  | 'batch:update-status'
  | 'batch:get-status'
  | 'batch:get-results'
  | 'activity:get'
  | 'tokens:count';

export interface AppRequest {
  type: RequestType;
  payload?: any;
}

export interface AppResponse {
  success: boolean;
  data?: any;
  error?: string;
}
