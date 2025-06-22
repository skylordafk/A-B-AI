# Frontend State Management & UI Enhancement

## AUTONOMOUS DEVELOPMENT EXPERIMENT

### Mission

Work autonomously through a complete 6-phase refactor specification over multiple days/weeks. Demonstrate sustained focus, parallel coordination, and complex project completion.

### Success Metrics

- Complete all 6 phases without human intervention on individual tasks
- Maintain coordination with parallel instance via INTEGRATION_STATUS.md
- Achieve integration without merge conflicts
- Deliver working, tested features

## Project Context

You are working on A-B/AI, an Electron application for AI model comparison and batch processing. The codebase needs a major refactor to modernize state management, improve the batch workflow UX, and create a unified dashboard. You are responsible for the frontend/UI refactor while another Claude instance handles the backend.

## CRITICAL: Setup Requirements Before Starting

1. **Import Shared Types**:

```typescript
// Reference the shared types created by backend team
import type { ModelDefinition, AppRequest, AppResponse } from '../../../shared/types';
```

2. **Backend Dependency**: You need the backend's stub IPC handler working first. Check `INTEGRATION_STATUS.md` to confirm backend has completed their stub implementation before proceeding with Phase 1.

## Your Scope & Ownership

### Files You Own (modify these):

- All files in `apps/ui/src/`
- UI components, routes, contexts, and styles
- Frontend state management migration

### Files You Must NOT Touch:

- Anything in `apps/main/src/` (backend team owns this)
- Files in `data/` directory
- Test files (update only your own frontend tests)
- Package files unless adding dependencies to apps/ui

## Implementation Tasks

### Phase 1: API Client Wrapper

1. **Create API Client** (`apps/ui/src/lib/api/client.ts`):

```typescript
import type {
  RequestType,
  AppRequest,
  AppResponse,
  ModelDefinition,
} from '../../../../shared/types';

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

      // Log for debugging during development
      console.log(`API Response [${type}]:`, response);

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
```

### Phase 2: Zustand State Management

1. **Install Zustand**:

```bash
cd apps/ui
npm install zustand immer
```

2. **Create Project Store** (`apps/ui/src/store/projectStore.ts`):

```typescript
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

    // Implement all actions...
    loadModels: async () => {
      const models = await apiClient.getModels();
      set((state) => {
        state.models = models;
      });
    },

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

    createBatchJob: async (fileName: string, rows: any[], useNativeAPI: boolean = false) => {
      const { currentProjectId } = get();
      if (!currentProjectId) throw new Error('No project selected');

      const job = await apiClient.submitBatch(currentProjectId, rows, useNativeAPI);
      set((state) => {
        state.batchJobs.set(job.id, job);
      });
      return job.id;
    },

    // ... implement other actions
  }))
);
```

3. **Replace Context Providers** in `App.tsx`:

```typescript
import { useEffect } from 'react';
import { useProjectStore } from './store/projectStore';

function App() {
  const initialize = useProjectStore(state => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ThemeProvider>
      {/* Remove ProjectProvider, ChatProvider, BatchProvider */}
      <AppRouter />
    </ThemeProvider>
  );
}
```

4. **Delete Context Files**:

- Remove `contexts/ProjectContext.tsx`
- Remove `contexts/ChatContext.tsx`
- Remove `contexts/BatchContext.tsx`

### Phase 3: Batch Workflow Enhancement

1. **Refactor Batch Route** (`apps/ui/src/routes/Batch.tsx`):

- Remove BatchDropZone as initial view
- Make SpreadsheetEditor the primary component
- Add toolbar with import/export options

2. **Enhance SpreadsheetEditor** (`apps/ui/src/components/batch/SpreadsheetEditor.tsx`):

```typescript
// Add output columns to the spreadsheet
const OUTPUT_COLUMNS = [
  { id: 'status', label: 'Status', width: 100, editable: false },
  { id: 'response', label: 'Response', width: 400, editable: false },
  { id: 'cost_usd', label: 'Cost ($)', width: 80, editable: false },
  { id: 'latency_ms', label: 'Latency (ms)', width: 100, editable: false },
  { id: 'error', label: 'Error', width: 200, editable: false }
];

// Add real-time update handling
useEffect(() => {
  const unsubscribe = useProjectStore.subscribe(
    state => state.batchJobs,
    (batchJobs) => {
      // Update spreadsheet rows when batch results change
      const currentJob = batchJobs.get(currentJobId);
      if (currentJob) {
        updateRowsWithResults(currentJob.results);
      }
    }
  );

  return unsubscribe;
}, [currentJobId]);

// Add import functionality
const handleImport = async (file: File) => {
  const content = await file.text();
  const rows = parseCSV(content); // or parseJSON
  setSpreadsheetData(rows);
};

// Add status indicators
const StatusCell = ({ status }: { status: string }) => {
  switch (status) {
    case 'processing':
      return <Spinner className="w-4 h-4" />;
    case 'completed':
      return <CheckIcon className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XIcon className="w-4 h-4 text-red-500" />;
    default:
      return null;
  }
};
```

### Phase 4: Unified Dashboard

1. **Create Dashboard Route** (`apps/ui/src/routes/Dashboard.tsx`):

```typescript
import { useProjectStore } from '../store/projectStore';
import { ActivityHistory } from '../components/ActivityHistory';
import { CostSummaryCard } from '../components/CostSummaryCard';
import { QuickActions } from '../components/QuickActions';

export function Dashboard() {
  const currentProject = useProjectStore(state =>
    state.projects.find(p => p.id === state.currentProjectId)
  );

  if (!currentProject) {
    return <div>No project selected</div>;
  }

  return (
    <div className="dashboard-container p-6">
      <h1 className="text-2xl font-bold mb-6">{currentProject.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <CostSummaryCard projectId={currentProject.id} />
        <QuickActions />
        <ProjectStats projectId={currentProject.id} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <ActivityHistory projectId={currentProject.id} limit={20} />
      </div>
    </div>
  );
}
```

2. **Create Unified Activity History** (`apps/ui/src/components/ActivityHistory.tsx`):

```typescript
// Merge ChatHistory and BatchHistory into unified component
interface ActivityItem {
  id: string;
  type: 'chat' | 'batch';
  timestamp: number;
  title: string;
  preview?: string;
  cost?: number;
  tokenCount?: number;
  status?: 'completed' | 'failed' | 'processing';
}

export function ActivityHistory({ projectId, limit = 50 }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'chat' | 'batch'>('all');

  useEffect(() => {
    loadActivities();
  }, [projectId, filter]);

  const loadActivities = async () => {
    const data = await apiClient.getActivity(projectId, filter === 'all' ? undefined : filter, limit);
    setActivities(data);
  };

  return (
    <div className="activity-history">
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('chat')}>Chats</button>
        <button onClick={() => setFilter('batch')}>Batches</button>
      </div>

      <div className="space-y-2">
        {activities.map(activity => (
          <ActivityItem key={activity.id} item={activity} />
        ))}
      </div>
    </div>
  );
}
```

### Phase 5: Advanced Features UI

1. **Add JSON Mode to Chat** (`apps/ui/src/ChatPage.tsx`):

```typescript
const [jsonMode, setJsonMode] = useState(false);
const [jsonSchema, setJsonSchema] = useState('');
const [schemaError, setSchemaError] = useState('');

const validateSchema = () => {
  if (!jsonSchema.trim()) return;
  try {
    JSON.parse(jsonSchema);
    setSchemaError('');
  } catch (error) {
    setSchemaError('Invalid JSON schema');
  }
};

// Add UI controls
<div className="json-mode-controls mb-4">
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={jsonMode}
      onChange={(e) => setJsonMode(e.target.checked)}
    />
    <span>JSON Mode</span>
  </label>

  {jsonMode && (
    <div className="mt-2">
      <textarea
        className="w-full h-32 font-mono text-sm"
        placeholder="Paste JSON Schema here..."
        value={jsonSchema}
        onChange={(e) => setJsonSchema(e.target.value)}
        onBlur={validateSchema}
      />
      {schemaError && (
        <p className="text-red-500 text-sm mt-1">{schemaError}</p>
      )}
    </div>
  )}
</div>
```

2. **Add Native Batch Toggle** (`apps/ui/src/routes/Batch.tsx`):

```typescript
const [useNativeAPI, setUseNativeAPI] = useState(false);

// In toolbar
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={useNativeAPI}
    onChange={(e) => setUseNativeAPI(e.target.checked)}
  />
  <span>Use Provider's Batch API (faster for large batches)</span>
</label>
```

### Phase 6: Three-Pane Layout

1. **Implement New Layout** (`apps/ui/src/App.tsx`):

```typescript
<div className="app-layout h-screen flex">
  <LeftSidebar className="w-64 flex-shrink-0">
    <ProjectSelector />
    <Navigation items={[
      { path: '/dashboard', label: 'Dashboard', icon: HomeIcon },
      { path: '/chat', label: 'Chat', icon: ChatIcon },
      { path: '/batch', label: 'Batch', icon: TableIcon },
      { path: '/settings', label: 'Settings', icon: SettingsIcon }
    ]} />
  </LeftSidebar>

  <ContextSidebar className="w-80 border-l">
    {location.pathname.startsWith('/chat') && <ChatList />}
    {location.pathname.startsWith('/batch') && <BatchJobList />}
  </ContextSidebar>

  <MainContent className="flex-1 overflow-auto">
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/chat/:conversationId?" element={<ChatPage />} />
      <Route path="/batch/:jobId?" element={<Batch />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  </MainContent>
</div>
```

## Integration Points from Backend

The backend provides these IPC endpoints via `window.api.request()`:

1. Models data: `{ type: 'models:get-all' }`
2. Project operations: create, list, get, switch
3. Chat operations: send (with optional JSON mode)
4. Batch operations: submit, update status
5. Activity queries: get project activity

All responses follow the AppResponse format with success/data/error fields.

## AUTONOMOUS OPERATION INSTRUCTIONS

### Critical Path Dependencies

**YOU CANNOT START Phase 1 until:**

- Backend team creates `shared/types/index.ts`
- Backend team commits stub IPC handler
- `INTEGRATION_STATUS.md` shows "✅ Stub IPC handler ready"

**Daily Dependency Check:**

1. Pull latest changes: `git pull origin main`
2. Verify `shared/types/index.ts` exists
3. Test IPC connection: `npm run dev` and check console for "STUB IPC" logs
4. If blocked, update `INTEGRATION_STATUS.md` immediately

**Integration Checkpoints:**

- Day 3: Backend provides stub IPC ✅
- Day 7: Your API client connects successfully ✅
- Day 10: Test against real IPC data ✅
- Day 14: Full integration test ✅

### Self-Monitoring

- Update CLAUDE_FRONTEND.md after each completed task
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

1. Update ModelSelect tests to use dynamic data
2. Update pricing calculation tests
3. Create tests for Zustand store actions
4. Test batch UI with real-time updates
5. Ensure no backend files were modified

## Implementation Order

1. Create API client wrapper (Phase 1)
2. Implement Zustand store and migrate from contexts (Phase 2)
3. Enhance batch workflow UI (Phase 3)
4. Create unified dashboard (Phase 4)
5. Add advanced features UI (Phase 5)
6. Implement three-pane layout (Phase 6)

Remember: Do NOT modify any files in apps/main/src/. The backend team will provide all data via the new unified IPC interface.
