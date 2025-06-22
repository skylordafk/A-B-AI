import SQLiteDatabase from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

export class Database {
  private db: SQLiteDatabase.Database;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'abai.db');
    this.db = new SQLiteDatabase(dbPath);
    this.initialize();
  }

  private initialize(): void {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        settings TEXT,
        created_at INTEGER,
        last_used INTEGER
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        name TEXT,
        created_at INTEGER,
        last_used INTEGER,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        role TEXT,
        content TEXT,
        provider TEXT,
        model TEXT,
        cost REAL,
        tokens_in INTEGER,
        tokens_out INTEGER,
        timestamp INTEGER,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      );

      CREATE TABLE IF NOT EXISTS batch_jobs (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        file_name TEXT,
        status TEXT,
        total_rows INTEGER,
        completed_rows INTEGER,
        failed_rows INTEGER,
        total_cost REAL,
        created_at INTEGER,
        completed_at INTEGER,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );

      CREATE TABLE IF NOT EXISTS batch_results (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        row_index INTEGER,
        original_data TEXT,
        prompt TEXT,
        response TEXT,
        status TEXT,
        cost REAL,
        tokens_in INTEGER,
        tokens_out INTEGER,
        latency INTEGER,
        error_message TEXT,
        FOREIGN KEY (job_id) REFERENCES batch_jobs(id)
      );
    `);

    console.debug('[Database] SQLite database initialized at:', this.db.name);
  }

  // Project methods
  async createProject(data: { name: string; description?: string; settings?: any }): Promise<any> {
    const id = uuidv4();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, description, settings, created_at, last_used)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const settingsJson = data.settings ? JSON.stringify(data.settings) : null;
    stmt.run(id, data.name, data.description || '', settingsJson, now, now);
    return this.getProject(id);
  }

  async getProject(id: string): Promise<any> {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const project = stmt.get(id) as any;
    if (project && project.settings) {
      project.settings = JSON.parse(project.settings);
    }
    return project;
  }

  async listProjects(): Promise<any[]> {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY last_used DESC');
    const projects = stmt.all();
    return projects.map((project: any) => ({
      ...project,
      settings: project.settings ? JSON.parse(project.settings) : null,
    }));
  }

  async updateProject(
    id: string,
    data: { name?: string; description?: string; settings?: any }
  ): Promise<any> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.settings !== undefined) {
      updates.push('settings = ?');
      values.push(JSON.stringify(data.settings));
    }

    updates.push('last_used = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = this.db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return this.getProject(id);
  }

  async deleteProject(id: string): Promise<void> {
    // Delete related conversations and messages first
    const deleteMessages = this.db.prepare(`
      DELETE FROM messages WHERE conversation_id IN (
        SELECT id FROM conversations WHERE project_id = ?
      )
    `);
    const deleteConversations = this.db.prepare('DELETE FROM conversations WHERE project_id = ?');
    const deleteProject = this.db.prepare('DELETE FROM projects WHERE id = ?');

    deleteMessages.run(id);
    deleteConversations.run(id);
    deleteProject.run(id);
  }

  // Conversation methods
  async createConversation(data: { projectId: string; name?: string }): Promise<any> {
    const id = uuidv4();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, project_id, name, created_at, last_used)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.projectId, data.name || 'New Conversation', now, now);
    return this.getConversation(id);
  }

  async getConversation(id: string): Promise<any> {
    const stmt = this.db.prepare('SELECT * FROM conversations WHERE id = ?');
    return stmt.get(id);
  }

  async listConversations(projectId: string): Promise<any[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM conversations WHERE project_id = ? ORDER BY last_used DESC'
    );
    return stmt.all(projectId);
  }

  async updateConversationUsage(id: string): Promise<void> {
    const stmt = this.db.prepare('UPDATE conversations SET last_used = ? WHERE id = ?');
    stmt.run(Date.now(), id);
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
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, provider, model, cost, tokens_in, tokens_out, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.conversationId,
      data.role,
      data.content,
      data.provider || null,
      data.model || null,
      data.cost || 0,
      data.tokensIn || 0,
      data.tokensOut || 0,
      Date.now()
    );

    // Update conversation last_used timestamp
    await this.updateConversationUsage(data.conversationId);

    return { id, ...data, timestamp: Date.now() };
  }

  async listMessages(conversationId: string): Promise<any[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC'
    );
    return stmt.all(conversationId);
  }

  async getMessagesAfter(conversationId: string, timestamp: number): Promise<any[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? AND timestamp > ? ORDER BY timestamp ASC'
    );
    return stmt.all(conversationId, timestamp);
  }

  // Batch job methods
  async createBatchJob(data: {
    projectId: string;
    fileName: string;
    totalRows: number;
  }): Promise<any> {
    const id = uuidv4();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO batch_jobs (id, project_id, file_name, status, total_rows, completed_rows, failed_rows, total_cost, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.projectId, data.fileName, 'pending', data.totalRows, 0, 0, 0, now);
    return this.getBatchJob(id);
  }

  async getBatchJob(id: string): Promise<any> {
    const stmt = this.db.prepare('SELECT * FROM batch_jobs WHERE id = ?');
    return stmt.get(id);
  }

  async updateBatchJobStatus(
    id: string,
    updates: {
      status?: string;
      completedRows?: number;
      failedRows?: number;
      totalCost?: number;
    }
  ): Promise<any> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);
      if (updates.status === 'completed' || updates.status === 'failed') {
        updateFields.push('completed_at = ?');
        values.push(Date.now());
      }
    }
    if (updates.completedRows !== undefined) {
      updateFields.push('completed_rows = ?');
      values.push(updates.completedRows);
    }
    if (updates.failedRows !== undefined) {
      updateFields.push('failed_rows = ?');
      values.push(updates.failedRows);
    }
    if (updates.totalCost !== undefined) {
      updateFields.push('total_cost = ?');
      values.push(updates.totalCost);
    }

    values.push(id);
    const stmt = this.db.prepare(`UPDATE batch_jobs SET ${updateFields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return this.getBatchJob(id);
  }

  async addBatchResult(data: {
    jobId: string;
    rowIndex: number;
    originalData: any;
    prompt: string;
    response?: string;
    status: string;
    cost?: number;
    tokensIn?: number;
    tokensOut?: number;
    latency?: number;
    errorMessage?: string;
  }): Promise<any> {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO batch_results (id, job_id, row_index, original_data, prompt, response, status, cost, tokens_in, tokens_out, latency, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.jobId,
      data.rowIndex,
      JSON.stringify(data.originalData),
      data.prompt,
      data.response || null,
      data.status,
      data.cost || 0,
      data.tokensIn || 0,
      data.tokensOut || 0,
      data.latency || 0,
      data.errorMessage || null
    );

    return { id, ...data };
  }

  async getBatchResults(jobId: string): Promise<any[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM batch_results WHERE job_id = ? ORDER BY row_index ASC'
    );
    const results = stmt.all(jobId);
    return results.map((result: any) => ({
      ...result,
      originalData: JSON.parse(result.original_data),
    }));
  }

  // Activity and analytics methods
  async getActivityStats(projectId?: string): Promise<any> {
    let messageQuery =
      'SELECT COUNT(*) as totalMessages, COALESCE(SUM(cost), 0) as totalCost FROM messages';
    let batchQuery =
      'SELECT COUNT(*) as totalJobs, COALESCE(SUM(total_cost), 0) as totalBatchCost FROM batch_jobs';
    const params: any[] = [];

    if (projectId) {
      messageQuery += ` WHERE conversation_id IN (SELECT id FROM conversations WHERE project_id = ?)`;
      batchQuery += ` WHERE project_id = ?`;
      params.push(projectId, projectId);
    }

    const messageStats = this.db
      .prepare(messageQuery)
      .get(...(projectId ? [projectId] : [])) as any;
    const batchStats = this.db.prepare(batchQuery).get(...(projectId ? [projectId] : [])) as any;

    return {
      totalMessages: messageStats.totalMessages || 0,
      totalCost: (messageStats.totalCost || 0) + (batchStats.totalBatchCost || 0),
      totalBatchJobs: batchStats.totalJobs || 0,
    };
  }

  // Cleanup methods
  close(): void {
    this.db.close();
  }

  backup(backupPath: string): void {
    this.db.backup(backupPath);
  }
}
