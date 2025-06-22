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

  // Define best models for highlighting
  const bestModels = new Set([
    'openai/gpt-4o',
    'anthropic/claude-3-5-sonnet-20241022',
    'gemini/gemini-1.5-pro-002',
    'grok/grok-3',
  ]);

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

  const selectBestModels = () => {
    const availableBestModels = Array.from(bestModels).filter((modelId) =>
      models.some((m) => `${m.provider}/${m.id}` === modelId)
    );
    onSelectionChange(availableBestModels);
  };

  const getPriceBadge = (pricing: any, modelId: string) => {
    if (!pricing) return '(unknown)';
    const promptPrice = pricing.prompt || 0;
    let badge = '';

    if (promptPrice === 0) badge = '(free)';
    else if (promptPrice <= 0.001) badge = '(fast)';
    else if (promptPrice <= 0.005) badge = '(premium)';
    else badge = '(expensive)';

    // Add "best" indicator for recommended models
    if (bestModels.has(modelId)) {
      badge = '⭐ ' + badge;
    }

    return badge;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Select Models</h3>
        <button
          onClick={selectBestModels}
          className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          Select Best Models
        </button>
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
                        {getPriceBadge(model.pricing, model.formattedId)}
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
