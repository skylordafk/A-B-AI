import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModelSelect from '../../apps/ui/src/components/ModelSelect';
import { useProjectStore } from '../../apps/ui/src/store/projectStore';
import modelPricing from '../../data/model-pricing.json';

// Mock the project store
vi.mock('../../apps/ui/src/store/projectStore', () => ({
  useProjectStore: vi.fn(),
}));

describe('ModelSelect Component', () => {
  const mockOnSelectionChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Provide the mock implementation for useProjectStore
    (useProjectStore as vi.Mock).mockReturnValue({
      models: modelPricing,
    });
  });

  it('should render providers and models correctly', async () => {
    render(<ModelSelect selectedModels={[]} onSelectionChange={mockOnSelectionChange} />);

    // Wait for a specific model to appear to ensure component has rendered
    expect(await screen.findByText('OpenAI')).toBeInTheDocument();

    // Check that some key models are rendered with their correct price badges
    // Using exact match on the accessible name for precision
    expect(screen.getByRole('checkbox', { name: 'GPT-4o (balanced)' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'GPT-4o Mini (fast)' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Claude 4 Opus (expensive)' })).toBeInTheDocument();
  });

  it('should handle model selection and deselection', async () => {
    const { rerender } = render(
      <ModelSelect selectedModels={[]} onSelectionChange={mockOnSelectionChange} />
    );

    const gpt4oCheckbox = await screen.findByRole('checkbox', { name: 'GPT-4o (balanced)' });

    // 1. Select a model
    fireEvent.click(gpt4oCheckbox);
    expect(mockOnSelectionChange).toHaveBeenLastCalledWith(['openai/gpt-4o']);

    // Simulate parent component updating the prop
    rerender(
      <ModelSelect selectedModels={['openai/gpt-4o']} onSelectionChange={mockOnSelectionChange} />
    );
    expect(gpt4oCheckbox).toBeChecked();

    // 2. Select another model
    const claudeCheckbox = await screen.findByRole('checkbox', {
      name: 'Claude 4 Opus (expensive)',
    });
    fireEvent.click(claudeCheckbox);
    expect(mockOnSelectionChange).toHaveBeenLastCalledWith(
      expect.arrayContaining(['openai/gpt-4o', 'anthropic/claude-4-opus'])
    );

    // Simulate parent component updating the prop
    rerender(
      <ModelSelect
        selectedModels={['openai/gpt-4o', 'anthropic/claude-4-opus']}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // 3. Deselect the first model
    fireEvent.click(gpt4oCheckbox);
    expect(mockOnSelectionChange).toHaveBeenLastCalledWith(['anthropic/claude-4-opus']);
  });

  it('should maintain model order within each provider section', async () => {
    render(<ModelSelect selectedModels={[]} onSelectionChange={() => {}} />);

    const openaiSection = await screen.findByText('OpenAI');
    const openaiContainer = openaiSection.closest('div');
    expect(openaiContainer).not.toBeNull();

    // Find all labels within the container and extract the model name
    const labels = Array.from(openaiContainer!.querySelectorAll('label'));
    const modelNames = labels.map((label) => label.textContent?.split(' (')[0].trim());

    // Get the expected order directly from the source of truth
    const expectedOpenAIOrder = modelPricing
      .filter((m) => m.provider === 'openai')
      .map((m) => m.name);

    expect(modelNames).toEqual(expectedOpenAIOrder);
  });
});
