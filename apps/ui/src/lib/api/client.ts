import type { IpcRequest, IpcResponse } from '../../types/ipc';
import type { ModelDefinition } from '../../../../shared/types';

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
  // Deep clone function that ensures only serializable data
  private sanitizePayload(obj: any, seen = new WeakSet()): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle primitives
    const type = typeof obj;
    if (type === 'string' || type === 'number' || type === 'boolean') {
      return obj;
    }

    // Skip non-serializable types
    if (type === 'function' || type === 'symbol') {
      return undefined;
    }

    // Handle Date objects
    if (obj instanceof Date) {
      return obj.toISOString();
    }

    // Handle RegExp
    if (obj instanceof RegExp) {
      return obj.toString();
    }

    // Detect circular references
    if (seen.has(obj)) {
      return '[Circular Reference]';
    }
    seen.add(obj);

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj
        .map((item) => this.sanitizePayload(item, seen))
        .filter((item) => item !== undefined);
    }

    // Handle Maps and Sets
    if (obj instanceof Map || obj instanceof Set) {
      return Array.from(obj);
    }

    // Handle plain objects - but check if it's truly plain
    if (obj.constructor === Object || obj.constructor === undefined) {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          const sanitizedValue = this.sanitizePayload(value, seen);
          if (sanitizedValue !== undefined) {
            sanitized[key] = sanitizedValue;
          }
        }
      }
      return sanitized;
    }

    // For any other object types (class instances, etc), try to convert to plain object
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      console.warn(`[IPC DEBUG] Could not serialize object of type ${obj.constructor?.name}`);
      return String(obj);
    }
  }

  async request<T = any>(type: string, payload?: any): Promise<T> {
    try {
      // Sanitize payload to ensure it's serializable
      const sanitizedPayload = payload ? this.sanitizePayload(payload) : undefined;

      // Debug: Log exactly what we're sending
      console.debug(`[IPC DEBUG] Sending request type: ${type}`);
      console.debug('[IPC DEBUG] Original payload:', payload);
      console.debug('[IPC DEBUG] Sanitized payload:', JSON.stringify(sanitizedPayload, null, 2));

      const response = (await window.api.request({
        type,
        payload: sanitizedPayload,
      } as IpcRequest)) as IpcResponse;

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
    // Ensure parameters are clean strings
    const cleanConversationId = String(conversationId);
    const cleanContent = String(content);

    // Handle single model (backward compatibility)
    if (typeof modelIds === 'string') {
      const cleanModelId = String(modelIds);
      // Create minimal, guaranteed serializable payload
      const payload = {
        conversationId: cleanConversationId,
        content: cleanContent,
        modelId: cleanModelId,
      };
      return this.request('chat:send', payload);
    }

    // Handle multiple models
    const responses = await Promise.all(
      modelIds.map((modelId) => {
        const cleanModelId = String(modelId);
        // Create minimal, guaranteed serializable payload
        const payload = {
          conversationId: cleanConversationId,
          content: cleanContent,
          modelId: cleanModelId,
        };
        return this.request('chat:send', payload);
      })
    );

    return responses;
  }

  async sendStructuredMessage(
    conversationId: string,
    content: string,
    modelIds: string | string[],
    jsonSchema?: object
  ) {
    // Ensure parameters are clean
    const cleanConversationId = String(conversationId);
    const cleanContent = String(content);
    const cleanJsonSchema = jsonSchema ? JSON.stringify(jsonSchema) : undefined;

    // Handle single model (backward compatibility)
    if (typeof modelIds === 'string') {
      const cleanModelId = String(modelIds);
      // Create minimal payload with only defined values
      const payload: any = {
        conversationId: cleanConversationId,
        content: cleanContent,
        modelId: cleanModelId,
      };

      // Only add options if needed
      if (cleanJsonSchema) {
        payload.options = {
          jsonMode: true,
          jsonSchema: cleanJsonSchema,
        };
      } else {
        payload.options = {
          jsonMode: true,
        };
      }

      return this.request('chat:send', payload);
    }

    // Handle multiple models
    const responses = await Promise.all(
      modelIds.map((modelId) => {
        const cleanModelId = String(modelId);
        // Create minimal payload with only defined values
        const payload: any = {
          conversationId: cleanConversationId,
          content: cleanContent,
          modelId: cleanModelId,
        };

        // Only add options if needed
        if (cleanJsonSchema) {
          payload.options = {
            jsonMode: true,
            jsonSchema: cleanJsonSchema,
          };
        } else {
          payload.options = {
            jsonMode: true,
          };
        }

        return this.request('chat:send', payload);
      })
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
