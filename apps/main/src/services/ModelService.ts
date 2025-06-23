import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { ModelDefinition } from '../../../../shared/types';
import { logger } from '../utils/logger';

export class ModelService {
  private models: ModelDefinition[] = [];

  constructor() {
    this.loadModels();
  }

  private loadModels(): void {
    try {
      let modelsPath: string | null = null;

      if (app.isPackaged) {
        // In packaged mode the file may reside in different locations depending on how electron-builder packed it.
        // 1. Inside the ASAR (app.getAppPath())
        // 2. As an extra file beside the ASAR (process.resourcesPath)
        // 3. One directory above app path (when asarUnpack is used)
        const candidatePaths = [
          path.join(app.getAppPath(), 'data', 'models.json'),
          path.join(process.resourcesPath, 'data', 'models.json'),
          path.join(path.dirname(app.getAppPath()), 'data', 'models.json'),
        ];

        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            modelsPath = p;
            break;
          }
        }

        if (!modelsPath) {
          throw new Error(
            `models.json not found in any candidate paths: ${candidatePaths.join(', ')}`
          );
        }
      } else {
        // In development, find the workspace root and go to data/models.json
        let workspaceRoot = __dirname;
        while (workspaceRoot !== '/') {
          const packageJsonPath = path.join(workspaceRoot, 'package.json');
          if (fs.existsSync(packageJsonPath)) {
            try {
              const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
              if (packageJson.name === 'abai-desktop') {
                break;
              }
            } catch (_) {
              // ignore parse errors and keep traversing up
            }
          }
          workspaceRoot = path.dirname(workspaceRoot);
        }
        modelsPath = path.join(workspaceRoot, 'data', 'models.json');
      }

      logger.debug(`[ModelService] Loading models from: ${modelsPath}`);
      const data = fs.readFileSync(modelsPath, 'utf-8');
      this.models = JSON.parse(data);
      logger.debug(`[ModelService] Loaded ${this.models.length} models`);
    } catch (error) {
      logger.error('[ModelService] Failed to load models:', error);
      this.models = [];
    }
  }

  getAllModels(): ModelDefinition[] {
    return this.models;
  }

  getModelById(id: string): ModelDefinition | undefined {
    return this.models.find((m) => m.id === id);
  }

  getModelsByProvider(provider: 'openai' | 'anthropic' | 'grok' | 'gemini'): ModelDefinition[] {
    return this.models.filter((m) => m.provider === provider);
  }

  getModelPricing(id: string): ModelDefinition['pricing'] | undefined {
    const model = this.getModelById(id);
    return model?.pricing;
  }

  getModelFeatures(id: string): ModelDefinition['features'] | undefined {
    const model = this.getModelById(id);
    return model?.features;
  }

  hasFeature(modelId: string, feature: ModelDefinition['features'][0]): boolean {
    const model = this.getModelById(modelId);
    return model?.features.includes(feature) || false;
  }

  reloadModels(): void {
    this.loadModels();
  }
}
