import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import SpreadsheetEditor from '../../apps/ui/src/components/batch/SpreadsheetEditor';
import type { BatchRow } from '../../apps/ui/src/types/batch';

// Mock clipboard API as it's not available in JSDOM
vi.mock('../../shared/utils/loadPricing', () => ({
  loadPricing: vi.fn(() => []), // Return empty array for model lookups
  getModel: vi.fn(() => ({
    pricing: { prompt: 0, completion: 0 },
  })),
}));

describe('SpreadsheetEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const initialRows: BatchRow[] = [
    { id: 'row-1', prompt: 'Initial Prompt', model: 'test-model', temperature: 0.5 },
  ];

  const defaultProps = {
    rows: initialRows,
    onSave: mockOnSave,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render, allow editing, and add new rows', async () => {
    const { container } = render(<SpreadsheetEditor {...defaultProps} />);

    // 1. Verify initial row is rendered
    expect(screen.getByText('Initial Prompt')).toBeInTheDocument();

    // 2. Edit a cell
    const cellToEdit = screen.getByText('Initial Prompt');
    await act(async () => {
      fireEvent.doubleClick(cellToEdit);
    });

    const input = await waitFor(() => container.querySelector('textarea'));
    expect(input).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(input!, { target: { value: 'Updated Prompt' } });
      fireEvent.blur(input!);
    });

    await waitFor(() => {
      expect(screen.getByText('Updated Prompt')).toBeInTheDocument();
    });

    // 3. Add a new row
    const addRowButton = screen.getByRole('button', { name: '+ Row' });
    await act(async () => {
      fireEvent.click(addRowButton);
    });

    await waitFor(() => {
      // Check for the new row number
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});
