// Mock database implementation for development when SQLite is having issues
// This allows the app to run without native SQLite dependencies

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export class Database {
  private projects: Map<string, any> = new Map();
  private conversations: Map<string, any> = new Map();
  private messages: Map<string, any[]> = new Map();
  private batchJobs: Map<string, any> = new Map();
  private batchResults: any[] = [];

  constructor() {
    logger.log('[MockDatabase] Using in-memory mock database (no persistence)');
  }

  // Project methods
  async createProject(data: { name: string; description?: string }): Promise<any> {
    const id = uuidv4();
    const now = Date.now();
    const project = {
      id,
      name: data.name,
      description: data.description || '',
      created_at: now,
      last_used: now,
    };
    this.projects.set(id, project);
    return project;
  }

  async getProject(id: string): Promise<any> {
    return this.projects.get(id);
  }

  async listProjects(): Promise<any[]> {
    return [...this.projects.values()].sort((a, b) => b.last_used - a.last_used);
  }

  async updateProject(id: string, data: any): Promise<any> {
    const project = this.projects.get(id);
    if (project) {
      const updatedProject = { ...project, ...data, last_used: Date.now() };
      this.projects.set(id, updatedProject);
      return updatedProject;
    }
    return null;
  }

  async deleteProject(id: string): Promise<void> {
    // Remove project
    this.projects.delete(id);

    // Remove related conversations
    const conversationIds = [...this.conversations.values()]
      .filter((c) => c.project_id === id)
      .map((c) => c.id);
    this.conversations.forEach((conversation, conversationId) => {
      if (conversation.project_id === id) {
        this.conversations.delete(conversationId);
      }
    });

    // Remove related messages
    this.messages.forEach((conversationMessages, conversationId) => {
      if (conversationIds.includes(conversationId)) {
        this.messages.delete(conversationId);
      }
    });

    // Remove related batch jobs
    this.batchJobs.forEach((job, jobId) => {
      if (job.project_id === id) {
        this.batchJobs.delete(jobId);
      }
    });
  }

  // Conversation methods
  async createConversation(data: { projectId: string; name: string }): Promise<any> {
    const id = uuidv4();
    const now = Date.now();
    const conversation = {
      id,
      project_id: data.projectId,
      name: data.name,
      created_at: now,
      last_used: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversation(id: string): Promise<any> {
    return this.conversations.get(id);
  }

  async listConversations(projectId: string): Promise<any[]> {
    return [...this.conversations.values()]
      .filter((c) => c.project_id === projectId)
      .sort((a, b) => b.last_used - a.last_used);
  }

  // Message methods
  async addMessage(data: {
    conversationId: string;
    role: string;
    content: string;
    provider?: string;
    model?: string;
    cost?: number;
    tokensIn?: number;
    tokensOut?: number;
  }): Promise<any> {
    const id = uuidv4();
    const message = {
      id,
      conversation_id: data.conversationId,
      role: data.role,
      content: data.content,
      provider: data.provider || null,
      model: data.model || null,
      cost: data.cost || 0,
      tokens_in: data.tokensIn || 0,
      tokens_out: data.tokensOut || 0,
      timestamp: Date.now(),
    };
    if (!this.messages.has(data.conversationId)) {
      this.messages.set(data.conversationId, []);
    }
    const messages = this.messages.get(data.conversationId);
    if (messages) {
      messages.push(message);
    }
    return message;
  }

  async getMessages(conversationId: string): Promise<any[]> {
    return this.messages.get(conversationId) || [];
  }

  // Batch job methods
  async createBatchJob(data: any): Promise<any> {
    const id = uuidv4();
    const job = {
      id,
      ...data,
      created_at: Date.now(),
    };
    this.batchJobs.set(id, job);
    return job;
  }

  async getBatchJob(id: string): Promise<any> {
    return this.batchJobs.get(id);
  }

  async updateBatchJob(id: string, data: any): Promise<any> {
    const job = this.batchJobs.get(id);
    if (job) {
      const updatedJob = { ...job, ...data };
      this.batchJobs.set(id, updatedJob);
      return updatedJob;
    }
    return null;
  }

  async updateBatchJobStatus(id: string, updates: any): Promise<any> {
    return this.updateBatchJob(id, updates);
  }

  async listBatchJobs(projectId: string): Promise<any[]> {
    return [...this.batchJobs.values()]
      .filter((j) => j.project_id === projectId)
      .sort((a, b) => b.created_at - a.created_at);
  }

  // Activity methods
  async getActivity(projectId: string, type?: string, limit: number = 50): Promise<any[]> {
    const activities = [];

    // Add messages as chat activities
    if (!type || type === 'chat') {
      const projectConversations = [...this.conversations.values()].filter(
        (c) => c.project_id === projectId
      );
      const conversationIds = projectConversations.map((c) => c.id);
      const chatMessages = [...this.messages.values()]
        .flat()
        .filter((m) => conversationIds.includes(m.conversation_id) && m.role === 'user')
        .map((m) => ({
          id: m.id,
          type: 'chat',
          timestamp: m.timestamp,
          title: `Chat: ${m.content.substring(0, 50)}...`,
          preview: m.content,
          cost: m.cost,
          tokenCount: m.tokens_in + m.tokens_out,
        }));
      activities.push(...chatMessages);
    }

    // Add batch jobs as batch activities
    if (!type || type === 'batch') {
      const batchActivities = [...this.batchJobs.values()]
        .filter((j) => j.project_id === projectId)
        .map((j) => ({
          id: j.id,
          type: 'batch',
          timestamp: j.created_at,
          title: `Batch: ${j.file_name || 'Unnamed'}`,
          status: j.status,
          cost: j.total_cost,
        }));
      activities.push(...batchActivities);
    }

    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  async getActivityStats(projectId?: string): Promise<any> {
    let messages = [...this.messages.values()].flat();
    let batchJobs = [...this.batchJobs.values()];

    if (projectId) {
      const conversationIds = [...this.conversations.values()]
        .filter((c) => c.project_id === projectId)
        .map((c) => c.id);
      messages = messages.filter((m) => conversationIds.includes(m.conversation_id));
      batchJobs = batchJobs.filter((j) => j.project_id === projectId);
    }

    const totalCost =
      messages.reduce((acc, m) => acc + (m.cost || 0), 0) +
      batchJobs.reduce((acc, j) => acc + (j.total_cost || 0), 0);

    return {
      totalMessages: messages.length,
      totalCost,
      totalBatchJobs: batchJobs.length,
    };
  }

  async listMessages(conversationId: string): Promise<any[]> {
    return this.getMessages(conversationId);
  }

  // Close method for compatibility
  close(): void {
    logger.log('[MockDatabase] Mock database closed');
  }
}
