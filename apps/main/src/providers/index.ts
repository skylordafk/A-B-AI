import { openaiProvider } from './openai';
import { anthropicProvider } from './anthropic';

export const allProviders = [openaiProvider, anthropicProvider];
export type ProviderId = 'openai' | 'anthropic';
