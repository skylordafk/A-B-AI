import type { RequestType, AppResponse, ModelDefinition } from '../../../../shared/types';

class APIError extends Error {
  constructor(
    message: string,
    public requestType: string,
    public payload?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

class APIClient {
  async request<T = any>(type: RequestType, payload?: any): Promise<T> {
    try {
      const response = (await window.api.request({ type, payload })) as AppResponse;

      // Debug logging for development
      console.debug(`API Response [${type}]:`, response);

      if (!response.success) {
        throw new APIError(response.error || 'Request failed', type, payload);
      }
      return response.data as T;
    } catch (error: any) {
      console.error(`API Error [${type}]:`, error);

      // Show user-friendly error messages
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Connection error - check if backend is running', type, payload);
    }
  }

  // Convenience methods
  async getModels() {
    return this.request<ModelDefinition[]>('models:get-all');
  }

  async createProject(name: string) {
    return this.request('project:create', { name });
  }

  async listProjects() {
    return this.request('project:list');
  }

  async sendMessage(conversationId: string, content: string, modelId: string) {
    return this.request('chat:send', { conversationId, content, modelId });
  }

  async sendStructuredMessage(
    conversationId: string,
    content: string,
    modelId: string,
    jsonSchema?: object
  ) {
    return this.request('chat:send-structured', { conversationId, content, modelId, jsonSchema });
  }

  async submitBatch(projectId: string, rows: any[], useNativeAPI: boolean = false) {
    const type = useNativeAPI ? 'batch:submit-native' : 'batch:submit';
    return this.request(type, { projectId, rows });
  }

  async getActivity(projectId: string, type?: 'chat' | 'batch', limit: number = 50) {
    return this.request('activity:get', { projectId, type, limit });
  }
}

export const apiClient = new APIClient();
