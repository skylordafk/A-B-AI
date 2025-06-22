# Backend Infrastructure & Data Layer Refactor

## AUTONOMOUS DEVELOPMENT EXPERIMENT

### Mission

Work autonomously through a complete 5-phase refactor specification over multiple days/weeks. Demonstrate sustained focus, parallel coordination, and complex project completion.

### Success Metrics

- Complete all 5 phases without human intervention on individual tasks
- Maintain coordination with parallel instance via INTEGRATION_STATUS.md
- Achieve integration without merge conflicts
- Deliver working, tested features

## Project Context

You are working on A-B/AI, an Electron application for AI model comparison and batch processing. The codebase needs a major refactor to centralize data management, unify state handling, and prepare for advanced features. You are responsible for the backend/main process refactor while another Claude instance handles the frontend.

## CRITICAL: Setup Requirements Before Starting

1. **Create Shared Types Directory FIRST**:

```bash
mkdir -p shared/types
```

Create `shared/types/index.ts` with all interfaces:

```typescript
export interface ModelDefinition {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'grok' | 'gemini';
  description: string;
  contextSize: number;
  pricing: {
    prompt: number;
    completion: number;
    cacheWrite5m?: number;
    cacheWrite1h?: number;
    cacheRead?: number;
  };
  features: ('web_search' | 'extended_thinking' | 'prompt_caching' | 'json_mode')[];
}

export type RequestType =
  | 'models:get-all'
  | 'chat:send'
  | 'chat:send-structured'
  | 'settings:save'
  | 'settings:load'
  | 'project:create'
  | 'project:list'
  | 'project:get'
  | 'project:switch'
  | 'conversation:create'
  | 'conversation:list'
  | 'messages:add'
  | 'messages:list'
  | 'batch:submit'
  | 'batch:submit-native'
  | 'batch:update-status'
  | 'activity:get';

export interface AppRequest {
  type: RequestType;
  payload?: any;
}

export interface AppResponse {
  success: boolean;
  data?: any;
  error?: string;
}
```

2. **Your FIRST task**: Create stub IPC handler so frontend can develop in parallel.

## Your Scope & Ownership

### Files You Own (modify these):

- All files in `apps/main/src/`
- All files in `data/`
- Create new directory `apps/main/src/db/`
- Modify `apps/main/src/preload.js`

### Files You Must NOT Touch:

- Anything in `apps/ui/src/` (frontend team owns this)
- Test files (update only your own backend tests)
- Package files unless adding dependencies to apps/main

## Implementation Tasks

### Phase 1: Centralized Model Data System

1. **Create Unified Model Data** (`data/models.json`):

```json
[
  {
    "id": "gpt-4o",
    "name": "GPT-4o",
    "provider": "openai",
    "description": "OpenAI's most advanced model",
    "contextSize": 128000,
    "pricing": {
      "prompt": 2.5,
      "completion": 10.0
    },
    "features": ["json_mode"]
  },
  {
    "id": "gpt-4o-mini",
    "name": "GPT-4o Mini",
    "provider": "openai",
    "description": "Fast and efficient OpenAI model",
    "contextSize": 128000,
    "pricing": {
      "prompt": 0.15,
      "completion": 0.6
    },
    "features": ["json_mode"]
  },
  {
    "id": "claude-3-5-sonnet-20241022",
    "name": "Claude 3.5 Sonnet",
    "provider": "anthropic",
    "description": "Anthropic's most capable model",
    "contextSize": 200000,
    "pricing": {
      "prompt": 3.0,
      "completion": 15.0,
      "cacheWrite5m": 3.75,
      "cacheWrite1h": 3.75,
      "cacheRead": 0.3
    },
    "features": ["prompt_caching"]
  }
]
```

2. **Delete Redundant Files**:

- Remove `data/ai-model-pricing.json`
- Remove `data/model-pricing.json`

3. **Create Model Service** (`apps/main/src/services/ModelService.ts`):

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { ModelDefinition } from '../../../shared/types';

export class ModelService {
  private models: ModelDefinition[] = [];

  constructor() {
    this.loadModels();
  }

  private loadModels(): void {
    const modelsPath = path.join(app.getAppPath(), 'data/models.json');
    const data = fs.readFileSync(modelsPath, 'utf-8');
    this.models = JSON.parse(data);
  }

  getAllModels(): ModelDefinition[] {
    return this.models;
  }

  getModelById(id: string): ModelDefinition | undefined {
    return this.models.find((m) => m.id === id);
  }
}
```

### Phase 2: Unified IPC Architecture

### **PRIORITY: Create Stub Handler First**

Before implementing the full IPC system, create a temporary stub to unblock the frontend team:

```typescript
// apps/main/src/stub-ipc.ts (TEMPORARY - delete after Phase 2)
import { ipcMain } from 'electron';

const MOCK_MODELS = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: "OpenAI's most advanced model",
    contextSize: 128000,
    pricing: { prompt: 2.5, completion: 10.0 },
    features: ['json_mode'],
  },
];

ipcMain.handle('app:request', async (event, request) => {
  console.log('STUB IPC:', request.type);

  switch (request.type) {
    case 'models:get-all':
      return { success: true, data: MOCK_MODELS };
    case 'project:list':
      return { success: true, data: [] };
    default:
      return { success: true, data: null };
  }
});
```

**Commit this stub immediately** so frontend team can start development.

1. **Create IPC Types** (`apps/main/src/types/ipc.ts`):

```typescript
import { RequestType, AppRequest, AppResponse } from '../../../shared/types';

export { RequestType, AppRequest, AppResponse };
```

2. **Refactor main.ts** - Replace ALL existing IPC handlers with:

```typescript
import { ModelService } from './services/ModelService';
import { Database } from './db/database';
import { RequestType, AppRequest, AppResponse } from '../../../shared/types';

const modelService = new ModelService();
const db = new Database();

ipcMain.handle('app:request', async (event, request: AppRequest): Promise<AppResponse> => {
  try {
    // Log all requests for debugging
    console.log(`IPC Request: ${request.type}`, request.payload);

    switch (request.type) {
      case 'models:get-all':
        return { success: true, data: modelService.getAllModels() };

      case 'project:create':
        const project = await db.createProject(request.payload);
        return { success: true, data: project };

      case 'chat:send':
        // Existing chat logic, but get pricing from modelService
        const model = modelService.getModelById(request.payload.modelId);
      // ... implement chat with model pricing

      // Implement all other cases...

      default:
        return { success: false, error: `Unknown request type: ${request.type}` };
    }
  } catch (error: any) {
    console.error(`IPC Error [${request.type}]:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
});
```

3. **Update preload.js**:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  request: (request) => ipcRenderer.invoke('app:request', request),
});
```

### Phase 3: SQLite Database Integration

1. **Install Dependencies**:

```bash
cd apps/main
npm install better-sqlite3 @types/better-sqlite3 uuid @types/uuid
```

2. **Create Database Module** (`apps/main/src/db/database.ts`):

```typescript
import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

export class Database {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'abai.db');
    this.db = new Database(dbPath);
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
  }

  // Project methods
  async createProject(data: { name: string; description?: string }): Promise<any> {
    const id = uuidv4();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, description, created_at, last_used)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.name, data.description || '', now, now);
    return this.getProject(id);
  }

  async getProject(id: string): Promise<any> {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id);
  }

  async listProjects(): Promise<any[]> {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY last_used DESC');
    return stmt.all();
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

    return { id, ...data };
  }

  // Implement other methods...
}
```

### Phase 4: Provider Refactoring

1. **Update Base Provider** (`apps/main/src/providers/base.ts`):

```typescript
export interface ProviderCapabilities {
  supportsJsonMode: boolean;
  supportsBatchAPI: boolean;
  supportsStreaming: boolean;
}

export interface ChatOptions {
  model: string;
  pricing: {
    prompt: number;
    completion: number;
  };
  jsonMode?: boolean;
  jsonSchema?: object;
}

export abstract class BaseProvider {
  abstract getCapabilities(): ProviderCapabilities;
  abstract chatWithHistory(messages: any[], options: ChatOptions): Promise<any>;

  // Optional batch API methods
  async submitBatch?(jobs: any[]): Promise<string> {
    throw new Error('Batch API not supported by this provider');
  }

  async getBatchStatus?(batchId: string): Promise<any> {
    throw new Error('Batch API not supported by this provider');
  }
}
```

2. **Update Each Provider** (example for `openai.ts`):

- Remove hardcoded MODEL_PRICING
- Remove listModels method
- Accept pricing in chatWithHistory options
- Implement JSON mode support
- Add batch API methods

### Phase 5: Batch Processing Enhancement

Implement native batch API support in providers and IPC handlers for:

- OpenAI Batch API
- Anthropic Batch API (when available)

## Integration Points for Frontend

The frontend will expect these exact IPC endpoints to work:

1. `{ type: 'models:get-all' }` → Returns array of ModelDefinition
2. `{ type: 'project:create', payload: { name: string } }` → Returns created project
3. `{ type: 'project:list' }` → Returns array of projects
4. `{ type: 'chat:send', payload: { conversationId, content, modelId } }` → Returns response
5. `{ type: 'batch:update-status', payload: { jobId, rowId, status, result } }` → Updates batch status

## AUTONOMOUS OPERATION INSTRUCTIONS

### Self-Monitoring

- Update CLAUDE_BACKEND.md after each completed task
- Update INTEGRATION_STATUS.md daily
- Create git commits with descriptive messages
- Run tests after each phase

### Problem-Solving Protocol

1. Attempt to resolve issues independently
2. Check specification for guidance
3. Look for similar patterns in existing codebase
4. Search documentation/examples
5. Only escalate if truly blocked for >30 minutes

### Success Validation

Each phase must pass these checks before proceeding:

- All files compile without errors
- Relevant tests pass
- Integration points work as specified
- Progress documented in INTEGRATION_STATUS.md

### Coordination Protocol

- Check INTEGRATION_STATUS.md before starting each day
- Update your status every few hours
- Flag blocking issues immediately
- Proactively communicate major changes

### Daily Operations

1. **Start of day**: Pull latest changes, review INTEGRATION_STATUS.md
2. **Every 2-3 hours**: Update INTEGRATION_STATUS.md with progress
3. **End of day**: Commit work, update status with next day's plans
4. **Weekly**: Review overall progress and adjust timeline if needed

## Testing & Validation

1. Ensure all provider tests pass after refactoring
2. Create integration test for database operations
3. Verify IPC communication with simple test calls
4. Test model data loading and pricing calculations
5. Ensure no frontend files were modified

## Implementation Order

1. Start with ModelService and models.json (Phase 1)
2. Implement unified IPC handler (Phase 2)
3. Add SQLite database (Phase 3)
4. Refactor providers (Phase 4)
5. Add batch API support (Phase 5)

Remember: Do NOT modify any files in apps/ui/src/. The frontend team will adapt to your new IPC interface.
