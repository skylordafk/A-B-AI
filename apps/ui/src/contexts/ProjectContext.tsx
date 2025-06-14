import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  provider?: string;
  cost?: number;
  tokens?: { input: number; output: number };
}

export interface ChatConversation {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: string;
  lastUsed: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  apiKeys: Record<string, string>;
  enabledMetrics: string[];
  throttleMs: number;
  chatHistory: ChatConversation[];
  currentConversationId?: string;
  createdAt: string;
  lastUsed: string;
}

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  createProject: (name: string, description?: string) => void;
  switchProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;

  // Chat history management
  createConversation: (name?: string) => string;
  switchConversation: (conversationId: string) => void;
  updateConversation: (conversationId: string, updates: Partial<ChatConversation>) => void;
  deleteConversation: (conversationId: string) => void;
  addMessage: (conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  getCurrentConversation: () => ChatConversation | null;

  hasProjects: boolean;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load projects from localStorage on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    try {
      const savedProjects = localStorage.getItem('abai_projects');
      const currentProjectId = localStorage.getItem('abai_current_project_id');

      if (savedProjects) {
        const projectList: Project[] = JSON.parse(savedProjects);

        // Ensure all projects have required properties for backward compatibility
        const migratedProjects = projectList.map((project) => {
          const chatHistory = project.chatHistory || [];

          // If no chat history, create an initial conversation
          if (chatHistory.length === 0) {
            const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const initialConversation: ChatConversation = {
              id: conversationId,
              name: 'New Chat',
              messages: [],
              createdAt: new Date().toISOString(),
              lastUsed: new Date().toISOString(),
            };
            chatHistory.push(initialConversation);
          }

          return {
            ...project,
            chatHistory,
            enabledMetrics: project.enabledMetrics || ['similarity', 'cost', 'latency'],
            throttleMs: project.throttleMs || 0,
            apiKeys: project.apiKeys || {},
            currentConversationId:
              project.currentConversationId ||
              (chatHistory.length > 0 ? chatHistory[0].id : undefined),
          };
        });

        setProjects(migratedProjects);

        // Save migrated projects back to localStorage
        localStorage.setItem('abai_projects', JSON.stringify(migratedProjects));

        if (currentProjectId) {
          const current = migratedProjects.find((p) => p.id === currentProjectId);
          if (current) {
            setCurrentProject(current);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProjects = (projectList: Project[]) => {
    localStorage.setItem('abai_projects', JSON.stringify(projectList));
    setProjects(projectList);
  };

  const createProject = (name: string, description?: string) => {
    const projectId = `project-${Date.now()}`;
    const conversationId = `conv-${Date.now()}`;

    const initialConversation: ChatConversation = {
      id: conversationId,
      name: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };

    const newProject: Project = {
      id: projectId,
      name,
      description,
      apiKeys: {},
      enabledMetrics: ['similarity', 'cost', 'latency'],
      throttleMs: 0,
      chatHistory: [initialConversation],
      currentConversationId: conversationId,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };

    const updatedProjects = [...projects, newProject];
    saveProjects(updatedProjects);
    switchProject(newProject.id);
  };

  const switchProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      const updatedProject = { ...project, lastUsed: new Date().toISOString() };
      const updatedProjects = projects.map((p) => (p.id === projectId ? updatedProject : p));

      setCurrentProject(updatedProject);
      saveProjects(updatedProjects);
      localStorage.setItem('abai_current_project_id', projectId);
      // Keep legacy localStorage key for backward compatibility
      localStorage.setItem('abai_current_project', project.name);
    }
  };

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    const updatedProjects = projects.map((p) =>
      p.id === projectId ? { ...p, ...updates, lastUsed: new Date().toISOString() } : p
    );

    saveProjects(updatedProjects);

    if (currentProject && currentProject.id === projectId) {
      // Always update currentProject to ensure React detects the change
      const updatedProject = updatedProjects.find((p) => p.id === projectId);
      if (updatedProject) {
        setCurrentProject({ ...updatedProject });
      }
    }
  };

  const deleteProject = (projectId: string) => {
    const updatedProjects = projects.filter((p) => p.id !== projectId);
    saveProjects(updatedProjects);

    if (currentProject && currentProject.id === projectId) {
      setCurrentProject(null);
      localStorage.removeItem('abai_current_project_id');
      localStorage.removeItem('abai_current_project');
    }
  };

  // Chat history management methods
  const createConversation = (name?: string): string => {
    if (!currentProject) return '';

    const conversationId = `conv-${Date.now()}`;
    const conversation: ChatConversation = {
      id: conversationId,
      name: name || `Conversation ${currentProject.chatHistory.length + 1}`,
      messages: [],
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };

    const updatedProject = {
      ...currentProject,
      chatHistory: [...currentProject.chatHistory, conversation],
      currentConversationId: conversationId,
      lastUsed: new Date().toISOString(),
    };

    updateProject(currentProject.id, updatedProject);
    return conversationId;
  };

  const switchConversation = (conversationId: string) => {
    if (!currentProject) return;

    updateProject(currentProject.id, {
      currentConversationId: conversationId,
      lastUsed: new Date().toISOString(),
    });
  };

  const updateConversation = (conversationId: string, updates: Partial<ChatConversation>) => {
    if (!currentProject) return;

    const updatedHistory = currentProject.chatHistory.map((conv) =>
      conv.id === conversationId
        ? { ...conv, ...updates, lastUsed: new Date().toISOString() }
        : conv
    );

    updateProject(currentProject.id, { chatHistory: updatedHistory });
  };

  const deleteConversation = (conversationId: string) => {
    if (!currentProject) return;

    const updatedHistory = currentProject.chatHistory.filter((conv) => conv.id !== conversationId);
    const newCurrentId =
      currentProject.currentConversationId === conversationId
        ? updatedHistory.length > 0
          ? updatedHistory[0].id
          : undefined
        : currentProject.currentConversationId;

    updateProject(currentProject.id, {
      chatHistory: updatedHistory,
      currentConversationId: newCurrentId,
    });
  };

  const addMessage = (conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (!currentProject) {
      return;
    }

    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    const updatedHistory = currentProject.chatHistory.map((conv) =>
      conv.id === conversationId
        ? {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastUsed: new Date().toISOString(),
          }
        : conv
    );

    updateProject(currentProject.id, { chatHistory: updatedHistory });

    // Also log to the main history system for analytics
    if (window.api?.logHistory) {
      window.api.logHistory(currentProject.name, {
        type: 'chat',
        conversationId,
        messageId: newMessage.id,
        role: message.role,
        content: message.content,
        provider: message.provider,
        cost: message.cost,
        tokens: message.tokens,
      });
    }
  };

  const getCurrentConversation = (): ChatConversation | null => {
    if (!currentProject || !currentProject.currentConversationId) return null;

    return (
      currentProject.chatHistory.find((conv) => conv.id === currentProject.currentConversationId) ||
      null
    );
  };

  const value: ProjectContextType = {
    currentProject,
    projects,
    createProject,
    switchProject,
    updateProject,
    deleteProject,

    // Chat history management
    createConversation,
    switchConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    getCurrentConversation,

    hasProjects: projects.length > 0,
    isLoading,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
