import { useState, useEffect } from 'react';
import type { ModelMeta } from '../../../main/src/types/model';

interface ModelSelectProps {
  selectedModels: string[];
  onSelectionChange: (models: string[]) => void;
}

export default function ModelSelect({ selectedModels, onSelectionChange }: ModelSelectProps) {
  const [availableModels, setAvailableModels] = useState<
    { provider: string; models: ModelMeta[] }[]
  >([]);

  useEffect(() => {
    // Fetch available models from all providers
    window.api.getAvailableModels().then(setAvailableModels);
  }, []);

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
        <div key={provider} className="border rounded p-2">
          <h4 className="text-sm font-semibold mb-2">{provider}</h4>
          {models.map((model) => (
            <label key={model.id} className="flex items-center gap-2 cursor-pointer mb-1">
              <input
                type="checkbox"
                checked={selectedModels.includes(model.id)}
                onChange={() => handleModelToggle(model.id)}
                className="cursor-pointer"
              />
              <span className="text-sm">
                {model.name} {getPriceBadge(model)}
              </span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
