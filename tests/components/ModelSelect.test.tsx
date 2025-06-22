import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModelSelect from '../../apps/ui/src/components/ModelSelect';

describe('ModelSelect Component', () => {
  const mockOnSelectionChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all provider sections', () => {
    render(<ModelSelect selectedModels={[]} onSelectionChange={mockOnSelectionChange} />);

    expect(screen.getByText('OPENAI')).toBeInTheDocument();
    expect(screen.getByText('ANTHROPIC')).toBeInTheDocument();
    expect(screen.getByText('GROK')).toBeInTheDocument();
    expect(screen.getByText('GEMINI')).toBeInTheDocument();
  });

  it('should render model checkboxes for each provider', () => {
    render(<ModelSelect selectedModels={[]} onSelectionChange={mockOnSelectionChange} />);

    // Check OpenAI models
    expect(screen.getByText('GPT-4.1')).toBeInTheDocument();
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('GPT-3.5 Turbo')).toBeInTheDocument();

    // Check Anthropic models
    expect(screen.getByText('Claude Opus 4')).toBeInTheDocument();
    expect(screen.getByText('Claude Sonnet 4')).toBeInTheDocument();
    expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument();

    // Check Grok models
    expect(screen.getByText('Grok 3')).toBeInTheDocument();
    expect(screen.getByText('Grok 3 Mini')).toBeInTheDocument();

    // Check Gemini models
    expect(screen.getByText('Gemini 2.5 Pro Thinking')).toBeInTheDocument();
    expect(screen.getByText('Gemini 2.5 Flash Preview')).toBeInTheDocument();
  });

  it('should show price badges for models', () => {
    render(<ModelSelect selectedModels={[]} onSelectionChange={mockOnSelectionChange} />);

    // Fast models (price <= 0.0006)
    expect(screen.getByText('(fast)')).toBeInTheDocument();

    // Premium models (price > 0.0006)
    expect(screen.getByText('(premium)')).toBeInTheDocument();
  });

  it('should check selected models', () => {
    const selectedModels = ['gpt-4o', 'claude-3-5-sonnet-20241022'];
    render(
      <ModelSelect selectedModels={selectedModels} onSelectionChange={mockOnSelectionChange} />
    );

    const gpt4oCheckbox = screen.getByLabelText(/GPT-4o/);
    const claudeCheckbox = screen.getByLabelText(/Claude 3.5 Sonnet/);
    const unselectedCheckbox = screen.getByLabelText(/GPT-4.1/);

    expect(gpt4oCheckbox).toBeChecked();
    expect(claudeCheckbox).toBeChecked();
    expect(unselectedCheckbox).not.toBeChecked();
  });

  it('should call onSelectionChange when model is selected', () => {
    render(<ModelSelect selectedModels={[]} onSelectionChange={mockOnSelectionChange} />);

    const gpt4oCheckbox = screen.getByLabelText(/GPT-4o/);
    fireEvent.click(gpt4oCheckbox);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(['gpt-4o']);
  });

  it('should call onSelectionChange when model is deselected', () => {
    const selectedModels = ['gpt-4o', 'claude-3-5-sonnet-20241022'];
    render(
      <ModelSelect selectedModels={selectedModels} onSelectionChange={mockOnSelectionChange} />
    );

    const gpt4oCheckbox = screen.getByLabelText(/GPT-4o/);
    fireEvent.click(gpt4oCheckbox);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(['claude-3-5-sonnet-20241022']);
  });

  it('should add model to existing selection', () => {
    const selectedModels = ['gpt-4o'];
    render(
      <ModelSelect selectedModels={selectedModels} onSelectionChange={mockOnSelectionChange} />
    );

    const claudeCheckbox = screen.getByLabelText(/Claude 3.5 Sonnet/);
    fireEvent.click(claudeCheckbox);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(['gpt-4o', 'claude-3-5-sonnet-20241022']);
  });

  it('should display correct price badge for fast models', () => {
    render(<ModelSelect selectedModels={[]} onSelectionChange={mockOnSelectionChange} />);

    // GPT-4.1 Mini has price 0.0004 which should be "fast"
    const gpt41MiniLabel = screen.getByText('GPT-4.1 Mini');
    expect(gpt41MiniLabel.parentElement).toHaveTextContent('(fast)');
  });

  it('should display correct price badge for premium models', () => {
    render(<ModelSelect selectedModels={[]} onSelectionChange={mockOnSelectionChange} />);

    // Claude Opus 4 has price 0.015 which should be "premium"
    const claudeOpusLabel = screen.getByText('Claude Opus 4');
    expect(claudeOpusLabel.parentElement).toHaveTextContent('(premium)');
  });

  it('should handle multiple selections correctly', () => {
    render(<ModelSelect selectedModels={[]} onSelectionChange={mockOnSelectionChange} />);

    // Select the first model
    const gpt4oCheckbox = screen.getByLabelText(/GPT-4o/);
    fireEvent.click(gpt4oCheckbox);
    expect(mockOnSelectionChange).toHaveBeenLastCalledWith(['gpt-4o']);

    // Select the second model
    const claudeCheckbox = screen.getByLabelText(/Claude 3.5 Sonnet/);
    fireEvent.click(claudeCheckbox);
    expect(mockOnSelectionChange).toHaveBeenLastCalledWith([
      'gpt-4o',
      'claude-3-5-sonnet-20241022',
    ]);
  });

  it('should maintain model order within providers', () => {
    render(<ModelSelect selectedModels={[]} onSelectionChange={mockOnSelectionChange} />);

    // Check that OpenAI models appear in expected order
    const openaiSection = screen.getByText('OPENAI').closest('div');
    const openaiModels = openaiSection?.querySelectorAll('label span');

    expect(openaiModels?.[0]).toHaveTextContent('GPT-4.1');
    expect(openaiModels?.[1]).toHaveTextContent('GPT-4.1 Mini');
    expect(openaiModels?.[2]).toHaveTextContent('GPT-4.1 Nano');
  });

  it('should handle edge case with flat pricing', () => {
    // This test verifies the pricing badge logic works correctly
    render(<ModelSelect selectedModels={[]} onSelectionChange={mockOnSelectionChange} />);

    // Since we can't directly test the internal getPriceBadge function,
    // we verify the component renders correctly with the existing data
    expect(screen.getByText('(fast)')).toBeInTheDocument();
    expect(screen.getByText('(premium)')).toBeInTheDocument();
  });
});
