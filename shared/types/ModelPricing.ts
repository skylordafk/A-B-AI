export interface Pricing {
  prompt: number;
  completion: number;
  [k: string]: number;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'grok' | 'gemini';
  description: string;
  contextSize: number;
  pricing: Pricing;
  features: string[];
}
