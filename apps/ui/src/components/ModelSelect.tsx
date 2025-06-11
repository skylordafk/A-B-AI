import React from 'react';

interface ModelMeta {
  id: string;
  name: string;
  pricePrompt: number;
}

interface ModelSelectProps {
  selectedModels: string[];
  onSelectionChange: (models: string[]) => void;
}

// Static list of available models based on the provider mapping
const AVAILABLE_MODELS: { provider: string; models: ModelMeta[] }[] = [
  {
    provider: 'OpenAI',
    models: [
      { id: 'o3-2025-04-16', name: 'O3 2025-04-16', pricePrompt: 0.002 },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', pricePrompt: 0.0004 },
    ],
  },
  {
    provider: 'Anthropic',
    models: [
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', pricePrompt: 0.015 },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', pricePrompt: 0.0005 },
    ],
  },
  {
    provider: 'Grok',
    models: [
      { id: 'grok-3', name: 'Grok 3', pricePrompt: 0.01 },
      { id: 'grok-3-mini', name: 'Grok 3 Mini', pricePrompt: 0.0005 },
    ],
  },
  {
    provider: 'Gemini',
    models: [
      {
        id: 'models/gemini-2.5-pro-thinking',
        name: 'Gemini 2.5 Pro Thinking',
        pricePrompt: 0.00125,
      },
      {
        id: 'models/gemini-2.5-flash-preview',
        name: 'Gemini 2.5 Flash Preview',
        pricePrompt: 0.00035,
      },
    ],
  },
];

export default function ModelSelect({ selectedModels, onSelectionChange }: ModelSelectProps) {
  const availableModels = AVAILABLE_MODELS;

  const handleModelToggle = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      onSelectionChange(selectedModels.filter((id) => id !== modelId));
    } else {
      onSelectionChange([...selectedModels, modelId]);
    }
  };

  const getPriceBadge = (model: ModelMeta) => {
    if (model.pricePrompt === -1) return '(flat)';
    if (model.pricePrompt <= 0.0006) return '(fast)';
    return '(premium)';
  };

  return (
    <div className="flex flex-wrap gap-4">
      {availableModels.map(({ provider, models }) => (
        <div
          key={provider}
          className="border border-stone-300 rounded-lg p-3 bg-stone-50 dark:bg-stone-700 dark:border-stone-600"
        >
          <h4 className="text-sm font-semibold mb-3 text-stone-800 dark:text-stone-100 uppercase tracking-wide">
            {provider}
          </h4>
          <div className="space-y-2">
            {models.map((model) => (
              <label key={model.id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedModels.includes(model.id)}
                  onChange={() => handleModelToggle(model.id)}
                  className="cursor-pointer w-4 h-4 text-slate-600 bg-stone-100 dark:bg-stone-600/30 border-stone-300 dark:border-stone-500 rounded focus:ring-slate-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-stone-800 dark:text-stone-100 group-hover:text-stone-900 dark:group-hover:text-stone-50 transition-colors">
                  {model.name}{' '}
                  <span className="text-xs text-stone-600 dark:text-stone-300 font-normal">
                    {getPriceBadge(model)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
