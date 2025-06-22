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

  async createProject(name: string, description?: string) {
    return this.request('project:create', { name, description });
  }

  async listProjects() {
    return this.request('project:list');
  }

  async getProject(id: string) {
    return this.request('project:get', { id });
  }

  async deleteProject(id: string) {
    return this.request('project:delete', { id });
  }

  async sendMessage(conversationId: string, content: string, modelIds: string | string[]) {
    // Handle single model (backward compatibility)
    if (typeof modelIds === 'string') {
      return this.request('chat:send', { conversationId, content, modelId: modelIds });
    }

    // Handle multiple models
    const responses = await Promise.all(
      modelIds.map((modelId) => this.request('chat:send', { conversationId, content, modelId }))
    );

    return responses;
  }

  async sendStructuredMessage(
    conversationId: string,
    content: string,
    modelIds: string | string[],
    jsonSchema?: object
  ) {
    // Handle single model (backward compatibility)
    if (typeof modelIds === 'string') {
      return this.request('chat:send-structured', {
        conversationId,
        content,
        modelId: modelIds,
        jsonSchema,
      });
    }

    // Handle multiple models
    const responses = await Promise.all(
      modelIds.map((modelId) =>
        this.request('chat:send-structured', { conversationId, content, modelId, jsonSchema })
      )
    );

    return responses;
  }

  async submitBatch(projectId: string, rows: any[], useNativeAPI: boolean = false) {
    if (!useNativeAPI) {
      return this.request('batch:submit', { projectId, rows });
    }

    // For native API, check if all rows use the same provider
    if (rows.length === 0) {
      throw new Error('No rows to submit');
    }

    // Extract providers from model IDs
    const providers = rows.map((row) => {
      const modelId = row.model;
      if (!modelId || typeof modelId !== 'string') {
        throw new Error('Invalid model ID in batch row');
      }
      const [provider] = modelId.split('/');
      return provider;
    });

    // Check if all providers are the same
    const uniqueProviders = [...new Set(providers)];
    if (uniqueProviders.length > 1) {
      // Mixed providers - fall back to regular batch processing
      console.warn('Mixed providers detected, falling back to regular batch processing');
      return this.request('batch:submit', { projectId, rows });
    }

    const providerName = uniqueProviders[0];

    // Use native batch API with the detected provider
    return this.request('batch:submit-native', { projectId, rows, providerName });
  }

  async getActivity(projectId: string, type?: 'chat' | 'batch', limit: number = 50) {
    return this.request('activity:get', { projectId, type, limit });
  }
}

export const apiClient = new APIClient();
