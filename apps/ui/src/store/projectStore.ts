import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Project } from '@shared/types';
import { apiClient as client } from '@ui/lib/api/client';
import type { LLMModel as ModelDefinition } from '@shared/types/ModelPricing';
import { v4 as uuidv4 } from 'uuid';

export interface Conversation {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  lastUsed: string;
}

export interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  currentConversationId: string | null;
  models: ModelDefinition[];
  conversations: Conversation[];
  messages: Record<string, any[]>;
  batchJobs: any[];
  isLoading: boolean;
  initializeStore: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<void>;
  addProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  switchProject: (projectId: string) => void;
  getProjectById: (projectId: string) => Project | undefined;
  currentProject: Project | undefined;
  // Conversation actions
  getConversationsArray: () => Conversation[];
  createConversation: (name: string) => Promise<void>;
  switchConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => Promise<void>;
  // Message actions
  addMessage: (conversationId: string, message: any) => void;
  sendMessage: (conversationId: string, content: string, modelIds: string[]) => Promise<void>;
  // Batch Job actions
  createBatchJob: (job: any) => void;
  updateBatchJobProgress: (jobId: string, progress: any) => void;
  // Model actions
  getModelById: (modelId: string) => ModelDefinition | undefined;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      currentConversationId: null,
      models: [],
      conversations: [],
      messages: {},
      batchJobs: [],
      isLoading: true,

      initializeStore: async () => {
        try {
          set({ isLoading: true });
          const projects = await client.listProjects();
          // TODO: Load conversations and messages from backend
          const modelsResponse = await window.api.request({ type: 'models:get-all' });
          const models = modelsResponse.data || [];
          set({
            projects,
            models,
            currentProjectId: get().currentProjectId || projects[0]?.id || null,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to initialize project store:', error);
          set({ isLoading: false });
        }
      },

      createProject: async (name: string, description?: string) => {
        const newProject = await client.createProject(name, description);
        set((state) => ({
          projects: [...state.projects, newProject],
          currentProjectId: state.projects.length === 0 ? newProject.id : state.currentProjectId,
        }));
      },

      addProject: (project: Project) => {
        set((state) => ({
          projects: [...state.projects, project],
        }));
      },
      deleteProject: (projectId: string) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          currentProjectId:
            state.currentProjectId === projectId
              ? state.projects[0]?.id || null
              : state.currentProjectId,
        }));
      },
      switchProject: (projectId: string) => {
        set({ currentProjectId: projectId, currentConversationId: null }); // Reset conversation on project switch
      },
      getProjectById: (projectId: string) => {
        return get().projects.find((p) => p.id === projectId);
      },
      get currentProject() {
        return get().projects.find((p) => p.id === get().currentProjectId);
      },

      // Conversation actions
      getConversationsArray: () => {
        return get().conversations;
      },
      createConversation: async (name: string) => {
        const projectId = get().currentProjectId;
        if (!projectId) return;

        const newConversation: Conversation = {
          id: uuidv4(),
          name,
          projectId,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        };
        set((state) => ({
          conversations: [...state.conversations, newConversation],
          currentConversationId: newConversation.id,
        }));
      },
      switchConversation: (conversationId: string) => {
        set({ currentConversationId: conversationId });
      },
      deleteConversation: async (conversationId: string) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== conversationId),
          messages: Object.fromEntries(
            Object.entries(state.messages).filter(([id]) => id !== conversationId)
          ),
          currentConversationId:
            state.currentConversationId === conversationId
              ? state.conversations.find((c) => c.projectId === state.currentProjectId)?.id || null
              : state.currentConversationId,
        }));
      },

      // Message actions
      addMessage: (conversationId: string, message: any) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: [...(state.messages[conversationId] || []), message],
          },
        }));
      },
      sendMessage: async (conversationId: string, content: string, modelIds: string[]) => {
        const userMessage = {
          id: `user-${Date.now()}-${Math.random()}`,
          role: 'user',
          content,
        };
        get().addMessage(conversationId, userMessage);

        try {
          const responses = await client.sendMessage(conversationId, content, modelIds);
          // Handle array of responses (multiple models) or single response
          const responseArray = Array.isArray(responses) ? responses : [responses];

          for (const response of responseArray) {
            if (response && response.answer) {
              const assistantMessage = {
                id: response.id || `msg-${Date.now()}-${Math.random()}`,
                role: 'assistant',
                content: response.answer,
                provider: response.provider,
                cost: response.costUSD,
              };
              get().addMessage(conversationId, assistantMessage);
            } else if (response && response.error) {
              const errorMessage = {
                id: `err-${Date.now()}-${Math.random()}`,
                role: 'assistant',
                content: `Error: ${response.error}`,
              };
              get().addMessage(conversationId, errorMessage);
            } else {
              const errorMessage = {
                id: `err-${Date.now()}-${Math.random()}`,
                role: 'assistant',
                content: `Error: Invalid response format`,
              };
              get().addMessage(conversationId, errorMessage);
            }
          }
        } catch (error) {
          const errorMessage = {
            id: `err-${Date.now()}-${Math.random()}`,
            role: 'assistant',
            content: `Network Error: ${error}`,
          };
          get().addMessage(conversationId, errorMessage);
        }
      },

      // Batch Job actions
      createBatchJob: (job: any) => {
        set((state) => ({
          batchJobs: [...state.batchJobs, job],
        }));
      },
      updateBatchJobProgress: (jobId: string, progress: any) => {
        set((state) => ({
          batchJobs: state.batchJobs.map((job) =>
            job.id === jobId ? { ...job, ...progress } : job
          ),
        }));
      },

      // Model actions
      getModelById: (modelId: string) => {
        return get().models.find((m) => m.id === modelId || `${m.provider}/${m.id}` === modelId);
      },
    }),
    {
      name: 'ab-ai-project-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        conversations: state.conversations,
        messages: state.messages,
        currentConversationId: state.currentConversationId,
      }),
    }
  )
);
