export type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'grok';

/**
 * Extract provider and model from model ID string
 */
export function parseModelId(modelId: string): { provider: ProviderType; model: string } {
  if (modelId.includes('/')) {
    const [provider, model] = modelId.split('/', 2);
    return {
      provider: provider as ProviderType,
      model,
    };
  }

  // Fallback: detect provider from model name
  if (modelId.startsWith('claude-') || modelId.includes('anthropic')) {
    return { provider: 'anthropic', model: modelId };
  }
  if (modelId.startsWith('gpt-') || modelId.startsWith('o') || modelId.includes('openai')) {
    return { provider: 'openai', model: modelId };
  }
  if (modelId.startsWith('gemini-') || modelId.includes('gemini')) {
    return { provider: 'gemini', model: modelId };
  }
  if (modelId.startsWith('grok-') || modelId.includes('grok')) {
    return { provider: 'grok', model: modelId };
  }

  // Default to OpenAI
  return { provider: 'openai', model: modelId };
}
