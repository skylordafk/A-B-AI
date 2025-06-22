// TEMPORARY STUB - DELETE AFTER PHASE 2 IMPLEMENTATION
import { ipcMain } from 'electron';
import { AppRequest, AppResponse } from '../../../shared/types';

const MOCK_MODELS = [
  {
    id: "gpt-4o",
    name: "GPT-4o", 
    provider: "openai",
    description: "OpenAI's most advanced model",
    contextSize: 128000,
    pricing: { prompt: 2.5, completion: 10.0 },
    features: ["json_mode"]
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai", 
    description: "Fast and efficient OpenAI model",
    contextSize: 128000,
    pricing: { prompt: 0.15, completion: 0.6 },
    features: ["json_mode"]
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    description: "Anthropic's most capable model", 
    contextSize: 200000,
    pricing: { 
      prompt: 3.0, 
      completion: 15.0,
      cacheWrite5m: 3.75,
      cacheWrite1h: 3.75,
      cacheRead: 0.3
    },
    features: ["prompt_caching"]
  }
];

const MOCK_PROJECTS = [
  {
    id: "project-1",
    name: "Default Project",
    description: "Default project for testing",
    created_at: Date.now(),
    last_used: Date.now()
  }
];

ipcMain.handle('app:request', async (event, request: AppRequest): Promise<AppResponse> => {
  console.log('STUB IPC:', request.type, request.payload);
  
  try {
    switch (request.type) {
      case 'models:get-all':
        return { success: true, data: MOCK_MODELS };
        
      case 'project:list':
        return { success: true, data: MOCK_PROJECTS };
        
      case 'project:create':
        const newProject = {
          id: `project-${Date.now()}`,
          name: request.payload?.name || 'New Project',
          description: request.payload?.description || '',
          created_at: Date.now(),
          last_used: Date.now()
        };
        MOCK_PROJECTS.push(newProject);
        return { success: true, data: newProject };
        
      case 'project:get':
        const project = MOCK_PROJECTS.find(p => p.id === request.payload?.id);
        return { success: true, data: project || null };
        
      case 'conversation:list':
        return { success: true, data: [] };
        
      case 'messages:list':
        return { success: true, data: [] };
        
      case 'chat:send':
        // Mock chat response
        return { 
          success: true, 
          data: {
            id: `msg-${Date.now()}`,
            content: "This is a mock response from the stub IPC handler.",
            role: "assistant",
            timestamp: Date.now()
          }
        };
        
      case 'settings:load':
        return { success: true, data: {} };
        
      case 'settings:save':
        return { success: true, data: null };
        
      case 'activity:get':
        return { success: true, data: { totalMessages: 0, totalCost: 0 } };
        
      default:
        console.warn(`Unhandled stub request type: ${request.type}`);
        return { success: true, data: null };
    }
  } catch (error: any) {
    console.error(`STUB IPC Error [${request.type}]:`, error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred in stub handler' 
    };
  }
});

console.log('STUB IPC HANDLER LOADED - Frontend team can now start development');