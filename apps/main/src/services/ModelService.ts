import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { ModelDefinition } from '../../../../shared/types';

export class ModelService {
  private models: ModelDefinition[] = [];

  constructor() {
    this.loadModels();
  }

  private loadModels(): void {
    try {
      const modelsPath = path.join(app.getAppPath(), 'data/models.json');
      const data = fs.readFileSync(modelsPath, 'utf-8');
      this.models = JSON.parse(data);
      console.debug(`[ModelService] Loaded ${this.models.length} models from data/models.json`);
    } catch (error) {
      console.error('[ModelService] Failed to load models:', error);
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
