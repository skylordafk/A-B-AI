import { openaiProvider } from './openai';
import { anthropicProvider } from './anthropic';
import { grokProvider } from './grok';
import { geminiProvider } from './gemini';

export const allProviders = [openaiProvider, anthropicProvider, grokProvider, geminiProvider];
export type ProviderId = 'openai' | 'anthropic' | 'grok' | 'gemini';
