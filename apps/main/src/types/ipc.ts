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