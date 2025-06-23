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
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Record<string, Message[]>;
  batchJobs: BatchJob[];
  models: ModelDefinition[];
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;

  // Project actions
  createProject: (name: string, description?: string) => Promise<void>;
  loadProjects: () => Promise<void>;
  switchProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;

  // Computed properties
  currentProject: Project | null;

  // Chat actions
  sendMessage: (
    content: string,
    selectedModels: string[],
    jsonMode?: boolean,
    jsonSchema?: object
  ) => Promise<void>;
  createConversation: (name: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  switchConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => Promise<void>;

  // Computed properties for UI
  getConversationsArray: () => Conversation[];

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
    conversations: [],
    currentConversationId: null,
    messages: {},
    batchJobs: [],
    models: [],
    isLoading: false,
    error: null,

    // Computed properties
    get currentProject() {
      const state = get();
      return state.projects.find((p) => p.id === state.currentProjectId) || null;
    },

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
    createProject: async (name: string, description?: string) => {
      try {
        const project = await apiClient.createProject(name, description);
        set((state) => {
          state.projects.push(project);
          state.currentProjectId = project.id;
          state.error = null; // Clear any previous errors
        });
        console.debug('[ProjectStore] Created project:', project.id);

        // Load conversations for the new project
        await get().loadConversations();
      } catch (error: any) {
        console.error('[ProjectStore] Failed to create project:', error);
        set((state) => {
          state.error = error.message;
        });
        throw error; // Re-throw so UI can handle it
      }
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

    deleteProject: async (projectId: string) => {
      await apiClient.deleteProject(projectId);
      set((state) => {
        state.projects = state.projects.filter((p) => p.id !== projectId);
        // If we deleted the current project, switch to another one or set to null
        if (state.currentProjectId === projectId) {
          state.currentProjectId = state.projects.length > 0 ? state.projects[0].id : null;
        }
      });
    },

    // Chat actions
    loadConversations: async () => {
      // Placeholder - will be implemented when backend provides this endpoint
      set((state) => {
        state.conversations = [];
        state.currentConversationId = null;
      });
    },

    createConversation: async (name: string) => {
      // Generate a proper UUID for the conversation
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };

      const newConversation: Conversation = {
        id: generateUUID(),
        projectId: get().currentProjectId!,
        name,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      set((state) => {
        state.conversations.push(newConversation);
        state.currentConversationId = newConversation.id;
      });
    },

    switchConversation: (conversationId: string) => {
      set((state) => {
        state.currentConversationId = conversationId;
      });
    },

    deleteConversation: async (conversationId: string) => {
      // TODO: Add backend API call when available
      // await apiClient.deleteConversation(conversationId);

      set((state) => {
        state.conversations = state.conversations.filter((c) => c.id !== conversationId);
        delete state.messages[conversationId];

        // If we deleted the current conversation, switch to another one or set to null
        if (state.currentConversationId === conversationId) {
          const projectConversations = state.conversations.filter(
            (c) => c.projectId === state.currentProjectId
          );
          state.currentConversationId =
            projectConversations.length > 0 ? projectConversations[0].id : null;
        }
      });
    },

    getConversationsArray: () => {
      const state = get();
      return state.conversations;
    },

    sendMessage: async (
      content: string,
      selectedModels: string[],
      jsonMode: boolean = false,
      jsonSchema?: object
    ) => {
      const { currentConversationId } = get();
      if (!currentConversationId) throw new Error('No conversation selected');

      if (selectedModels.length === 0) throw new Error('No models selected');

      const responses = jsonMode
        ? await apiClient.sendStructuredMessage(
            currentConversationId,
            content,
            selectedModels,
            jsonSchema
          )
        : await apiClient.sendMessage(currentConversationId, content, selectedModels);

      // Update messages in store
      set((state) => {
        const messages = state.messages[currentConversationId] || [];

        // Add user message
        const userMessage = {
          id: `user-${Date.now()}`,
          conversationId: currentConversationId,
          role: 'user' as const,
          content,
          timestamp: Date.now(),
        };

        // Handle responses (single or multiple)
        const responseArray = Array.isArray(responses) ? responses : [responses];
        const assistantMessages = responseArray.map((response, index) => ({
          id: `assistant-${Date.now()}-${index}`,
          conversationId: currentConversationId,
          role: 'assistant' as const,
          content: response.content || response.answer || 'No response',
          provider: response.provider,
          model: response.model,
          cost: response.cost || response.costUSD,
          timestamp: Date.now() + index, // Ensure unique timestamps
        }));

        const newMessages = [...messages, userMessage, ...assistantMessages];
        state.messages[currentConversationId] = newMessages;
      });
    },

    // Batch actions
    createBatchJob: async (fileName: string, rows: any[], useNativeAPI: boolean = false) => {
      const { currentProjectId } = get();
      if (!currentProjectId) throw new Error('No project selected');

      const job = await apiClient.submitBatch(currentProjectId, rows, useNativeAPI);
      set((state) => {
        state.batchJobs.push(job);
      });
      return job.id;
    },

    updateBatchResult: (jobId: string, rowId: string, result: any) => {
      set((state) => {
        const job = state.batchJobs.find((j) => j.id === jobId);
        if (job && job.results) {
          job.results.set(rowId, result);
        }
      });
    },
  }))
);
