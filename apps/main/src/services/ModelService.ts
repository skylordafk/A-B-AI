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
      let modelsPath: string;

      if (app.isPackaged) {
        // In packaged app, models.json should be at the app root
        modelsPath = path.join(app.getAppPath(), 'data/models.json');
      } else {
        // In development, we need to go from apps/main/src/services to root
        // When compiled, this will be in apps/main/dist/apps/main/src/services
        // So we need to check if we're running from dist or src
        const currentDir = __dirname;

        if (currentDir.includes('/dist/')) {
          // Running from compiled code: apps/main/dist/apps/main/src/services -> root (7 levels up)
          modelsPath = path.join(__dirname, '../../../../../../../data/models.json');
        } else {
          // Running from source: apps/main/src/services -> root
          modelsPath = path.join(__dirname, '../../../../data/models.json');
        }
      }

      logger.debug(`[ModelService] Loading models from: ${modelsPath}`);
      const data = fs.readFileSync(modelsPath, 'utf-8');
      this.models = JSON.parse(data);
      logger.debug(`[ModelService] Loaded ${this.models.length} models from data/models.json`);
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
