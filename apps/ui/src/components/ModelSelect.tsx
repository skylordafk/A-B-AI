import React, { useState } from 'react';
import { useProjectStore } from '../store/projectStore';

interface ModelSelectProps {
  selectedModels: string[];
  onSelectionChange: (models: string[]) => void;
}

export default function ModelSelect({ selectedModels, onSelectionChange }: ModelSelectProps) {
  const { models } = useProjectStore();
  const [openProviders, setOpenProviders] = useState<string[]>([
    'openai',
    'anthropic',
    'grok',
    'gemini',
  ]); // Default all open

  // Group models by provider and create properly formatted IDs
  const modelsByProvider = models.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      // Create properly formatted model ID: provider/modelId
      const formattedModel = {
        ...model,
        formattedId: `${model.provider}/${model.id}`,
      };
      acc[model.provider].push(formattedModel);
      return acc;
    },
    {} as Record<string, Array<(typeof models)[0] & { formattedId: string }>>
  );

  // Provider display names
  const providerNames: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    grok: 'Grok',
    gemini: 'Gemini',
  };

  const handleProviderToggle = (provider: string) => {
    setOpenProviders((prev) =>
      prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider]
    );
  };

  const handleModelToggle = (formattedId: string) => {
    if (selectedModels.includes(formattedId)) {
      onSelectionChange(selectedModels.filter((id) => id !== formattedId));
    } else {
      onSelectionChange([...selectedModels, formattedId]);
    }
  };

  const getPriceBadge = (pricing: any) => {
    if (!pricing) return '(unknown)';
    const promptPrice = pricing.prompt || 0;

    // Prices are per 1M tokens.
    if (promptPrice === 0) return '(free)';
    if (promptPrice <= 1.0) return '(fast)'; // e.g., gpt-4o-mini at $0.6
    if (promptPrice <= 5.0) return '(balanced)'; // e.g., gpt-4o at $5.0
    return '(expensive)'; // e.g., claude-4-opus at $15.0
  };

  // Add a guard clause to prevent rendering if models are not yet loaded
  if (!models || models.length === 0) {
    return <div>Loading models...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Select Models</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
          <div
            key={provider}
            className="border border-stone-300 rounded p-2 bg-stone-50 dark:bg-stone-700 dark:border-stone-600"
          >
            <button
              onClick={() => handleProviderToggle(provider)}
              className="w-full flex justify-between items-center text-left"
            >
              <h4 className="text-xs font-semibold text-stone-800 dark:text-stone-100 uppercase tracking-wide">
                {providerNames[provider] || provider}
              </h4>
              <svg
                className={`w-4 h-4 transform transition-transform ${
                  openProviders.includes(provider) ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {openProviders.includes(provider) && (
              <div className="mt-2 space-y-1">
                {providerModels.map((model) => (
                  <label
                    key={model.formattedId}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(model.formattedId)}
                      onChange={() => handleModelToggle(model.formattedId)}
                      className="cursor-pointer w-3 h-3 text-slate-600 bg-stone-100 dark:bg-stone-600/30 border-stone-300 dark:border-stone-500 rounded-sm focus:ring-slate-500 focus:ring-1"
                    />
                    <span className="text-xs font-medium text-stone-800 dark:text-stone-100 group-hover:text-stone-900 dark:group-hover:text-stone-50 transition-colors">
                      {model.name}{' '}
                      <span className="text-[10px] text-stone-600 dark:text-stone-300 font-normal">
                        {getPriceBadge(model.pricing)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
