import { LLMModel as ModelDefinition } from '../../../../shared/types/ModelPricing';
import { getModel, loadPricing } from '@shared/utils/loadPricing';
import { logger } from '../utils/logger';

export class ModelService {
  private models: ModelDefinition[] = [];

  constructor() {
    this.loadModels();
  }

  private loadModels(): void {
    try {
      this.models = loadPricing();
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
    // getModel throws an error if not found, but this service is expected
    // to return undefined, so we'll wrap it.
    try {
      return getModel(id);
    } catch {
      return undefined;
    }
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
