import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { apiClient } from '../lib/api/client';
import type { ModelDefinition } from '../../../../shared/types';

interface Project {
  id: string;
  name: string;
  description?: string;
  settings?: any;
  createdAt: number;
  lastUsed: number;
}

interface Conversation {
  id: string;
  projectId: string;
  name: string;
  createdAt: number;
  lastUsed: number;
}

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: string;
  model?: string;
  cost?: number;
  timestamp: number;
}

interface BatchJob {
  id: string;
  projectId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  completedRows: number;
  failedRows: number;
  results: Map<string, any>;
}

interface ProjectStore {
  // State
  projects: Project[];
  currentProjectId: string | null;
  conversations: Map<string, Conversation>;
  currentConversationId: string | null;
  messages: Map<string, Message[]>;
  batchJobs: Map<string, BatchJob>;
  models: ModelDefinition[];
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;

  // Project actions
  createProject: (name: string) => Promise<void>;
  loadProjects: () => Promise<void>;
  switchProject: (projectId: string) => Promise<void>;

  // Chat actions
  sendMessage: (content: string, jsonMode?: boolean, jsonSchema?: object) => Promise<void>;
  createConversation: (name: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  switchConversation: (conversationId: string) => void;

  // Batch actions
  createBatchJob: (fileName: string, rows: any[], useNativeAPI?: boolean) => Promise<string>;
  updateBatchResult: (jobId: string, rowId: string, result: any) => void;

  // Model actions
  loadModels: () => Promise<void>;
  getModelById: (modelId: string) => ModelDefinition | undefined;
}

export const useProjectStore = create<ProjectStore>()(
  immer((set, get) => ({
    // Initial state
    projects: [],
    currentProjectId: null,
    conversations: new Map(),
    currentConversationId: null,
    messages: new Map(),
    batchJobs: new Map(),
    models: [],
    isLoading: false,
    error: null,

    // Initialize store
    initialize: async () => {
      set((state) => {
        state.isLoading = true;
      });
      try {
        await get().loadModels();
        await get().loadProjects();
      } catch (error: any) {
        set((state) => {
          state.error = error.message;
        });
      } finally {
        set((state) => {
          state.isLoading = false;
        });
      }
    },

    // Model actions
    loadModels: async () => {
      const models = await apiClient.getModels();
      set((state) => {
        state.models = models;
      });
    },

    getModelById: (modelId: string) => {
      return get().models.find((model) => model.id === modelId);
    },

    // Project actions
    createProject: async (name: string) => {
      const project = await apiClient.createProject(name);
      set((state) => {
        state.projects.push(project);
        state.currentProjectId = project.id;
      });
    },

    loadProjects: async () => {
      const projects = await apiClient.listProjects();
      set((state) => {
        state.projects = projects;
        if (projects.length > 0 && !state.currentProjectId) {
          state.currentProjectId = projects[0].id;
        }
      });
    },

    switchProject: async (projectId: string) => {
      set((state) => {
        state.currentProjectId = projectId;
      });
      await get().loadConversations();
    },

    // Chat actions
    loadConversations: async () => {
      // Placeholder - will be implemented when backend provides this endpoint
      set((state) => {
        state.conversations = new Map();
        state.currentConversationId = null;
      });
    },

    createConversation: async (name: string) => {
      // Placeholder - will be implemented when backend provides this endpoint
      const newConversation: Conversation = {
        id: `conv-${Date.now()}`,
        projectId: get().currentProjectId!,
        name,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      set((state) => {
        state.conversations.set(newConversation.id, newConversation);
        state.currentConversationId = newConversation.id;
      });
    },

    switchConversation: (conversationId: string) => {
      set((state) => {
        state.currentConversationId = conversationId;
      });
    },

    sendMessage: async (content: string, jsonMode: boolean = false, jsonSchema?: object) => {
      const { currentConversationId } = get();
      if (!currentConversationId) throw new Error('No conversation selected');

      const response = jsonMode
        ? await apiClient.sendStructuredMessage(
            currentConversationId,
            content,
            'gpt-4o',
            jsonSchema
          )
        : await apiClient.sendMessage(currentConversationId, content, 'gpt-4o');

      // Update messages in store
      set((state) => {
        const messages = state.messages.get(currentConversationId) || [];
        messages.push(
          {
            id: Date.now().toString(),
            conversationId: currentConversationId,
            role: 'user',
            content,
            timestamp: Date.now(),
          },
          response
        );
        state.messages.set(currentConversationId, messages);
      });
    },

    // Batch actions
    createBatchJob: async (fileName: string, rows: any[], useNativeAPI: boolean = false) => {
      const { currentProjectId } = get();
      if (!currentProjectId) throw new Error('No project selected');

      const job = await apiClient.submitBatch(currentProjectId, rows, useNativeAPI);
      set((state) => {
        state.batchJobs.set(job.id, job);
      });
      return job.id;
    },

    updateBatchResult: (jobId: string, rowId: string, result: any) => {
      set((state) => {
        const job = state.batchJobs.get(jobId);
        if (job) {
          job.results.set(rowId, result);
        }
      });
    },
  }))
);
