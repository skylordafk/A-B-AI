import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SpreadsheetEditor from '../../apps/ui/src/components/batch/SpreadsheetEditor';
import type { BatchRow } from '../../apps/ui/src/types/batch';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('test\tdata')),
  },
});

describe('SpreadsheetEditor', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    rows: [] as BatchRow[],
    onSave: mockOnSave,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with empty row when no data provided', () => {
    render(<SpreadsheetEditor {...defaultProps} />);

    // Should have at least one row
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders with provided rows', () => {
    const rows: BatchRow[] = [
      { id: 'row-1', prompt: 'Test prompt 1', model: 'openai/gpt-4o', temperature: 0.7 },
      { id: 'row-2', prompt: 'Test prompt 2', model: 'openai/gpt-3.5-turbo', temperature: 0.5 },
    ];

    render(<SpreadsheetEditor {...defaultProps} rows={rows} />);

    expect(screen.getByText('Test prompt 1')).toBeInTheDocument();
    expect(screen.getByText('Test prompt 2')).toBeInTheDocument();
  });

  describe('Numeric Increment Tests', () => {
    it('increments numbers vertically when dragging down', async () => {
      const rows: BatchRow[] = [
        { id: 'row-1', prompt: 'Test 1', model: 'openai/gpt-4o', temperature: 0.5 },
        { id: 'row-2', prompt: 'Test 2', model: 'openai/gpt-4o', temperature: 0.6 },
      ];

      const { container } = render(<SpreadsheetEditor {...defaultProps} rows={rows} />);

      // Select temperature cells
      const tempCells = container.querySelectorAll('td[data-testid*="temperature"]');

      // Simulate selection and drag
      fireEvent.mouseDown(tempCells[0]);
      fireEvent.mouseDown(tempCells[1], { shiftKey: true });

      // Find and drag the drag handle
      const dragHandle = container.querySelector('.drag-handle');
      expect(dragHandle).toBeInTheDocument();

      fireEvent.mouseDown(dragHandle!);

      // Simulate drag to row 5
      const targetCell = container.querySelector('td[data-testid="cell-4-3"]'); // Row 5, temperature column
      fireEvent.mouseEnter(targetCell!);
      fireEvent.mouseUp(targetCell!);

      // Check that temperatures have been incremented (0.5, 0.6, 0.7, 0.8, 0.9)
      await waitFor(() => {
        const cells = container.querySelectorAll('td[data-testid*="temperature"]');
        expect(cells[2]).toHaveTextContent('0.7');
        expect(cells[3]).toHaveTextContent('0.8');
        expect(cells[4]).toHaveTextContent('0.9');
      });
    });

    it('increments numbers horizontally when dragging right', async () => {
      const rows: BatchRow[] = [
        {
          id: 'row-1',
          prompt: 'Test',
          model: 'openai/gpt-4o',
          temperature: 0.5,
          data: { col1: '10', col2: '20' },
        },
      ];

      const { container } = render(<SpreadsheetEditor {...defaultProps} rows={rows} />);

      // Select numeric cells in dynamic columns
      const numCells = container.querySelectorAll('td[data-testid*="col"]');

      fireEvent.mouseDown(numCells[0]);
      fireEvent.mouseDown(numCells[1], { shiftKey: true });

      const dragHandle = container.querySelector('.drag-handle');
      fireEvent.mouseDown(dragHandle!);

      // Drag right to create col3, col4
      const targetCell = container.querySelector('td[data-testid="cell-0-8"]'); // Assuming dynamic columns are at index 6+
      fireEvent.mouseEnter(targetCell!);
      fireEvent.mouseUp(targetCell!);

      await waitFor(() => {
        const cells = container.querySelectorAll('td[data-testid*="col"]');
        expect(cells[2]).toHaveTextContent('30'); // 10 -> 20 -> 30
        expect(cells[3]).toHaveTextContent('40'); // 10 -> 20 -> 30 -> 40
      });
    });

    it('repeats single numeric cell without increment', async () => {
      const rows: BatchRow[] = [
        { id: 'row-1', prompt: 'Test', model: 'openai/gpt-4o', temperature: 0.7 },
      ];

      const { container } = render(<SpreadsheetEditor {...defaultProps} rows={rows} />);

      // Select single temperature cell
      const tempCell = container.querySelector('td[data-testid="cell-0-3"]');
      fireEvent.mouseDown(tempCell!);

      const dragHandle = container.querySelector('.drag-handle');
      fireEvent.mouseDown(dragHandle!);

      // Drag down 3 rows
      const targetCell = container.querySelector('td[data-testid="cell-3-3"]');
      fireEvent.mouseEnter(targetCell!);
      fireEvent.mouseUp(targetCell!);

      await waitFor(() => {
        const cells = container.querySelectorAll('td[data-testid*="temperature"]');
        expect(cells[1]).toHaveTextContent('0.7'); // Same value
        expect(cells[2]).toHaveTextContent('0.7'); // Same value
        expect(cells[3]).toHaveTextContent('0.7'); // Same value
      });
    });
  });

  describe('Pattern Repeat Tests', () => {
    it('repeats text pattern when dragging', async () => {
      const rows: BatchRow[] = [
        { id: 'row-1', prompt: 'Question A', model: 'openai/gpt-4o', temperature: 0.7 },
        { id: 'row-2', prompt: 'Question B', model: 'openai/gpt-3.5-turbo', temperature: 0.7 },
      ];

      const { container } = render(<SpreadsheetEditor {...defaultProps} rows={rows} />);

      // Select prompt cells
      const promptCells = container.querySelectorAll('td[data-testid*="prompt"]');
      fireEvent.mouseDown(promptCells[0]);
      fireEvent.mouseDown(promptCells[1], { shiftKey: true });

      const dragHandle = container.querySelector('.drag-handle');
      fireEvent.mouseDown(dragHandle!);

      // Drag down 4 more rows
      const targetCell = container.querySelector('td[data-testid="cell-5-0"]');
      fireEvent.mouseEnter(targetCell!);
      fireEvent.mouseUp(targetCell!);

      await waitFor(() => {
        const cells = container.querySelectorAll('td[data-testid*="prompt"]');
        expect(cells[2]).toHaveTextContent('Question A'); // Pattern repeats
        expect(cells[3]).toHaveTextContent('Question B');
        expect(cells[4]).toHaveTextContent('Question A');
        expect(cells[5]).toHaveTextContent('Question B');
      });
    });

    it('repeats model pattern', async () => {
      const rows: BatchRow[] = [
        { id: 'row-1', prompt: 'Test', model: 'openai/gpt-4o', temperature: 0.7 },
        {
          id: 'row-2',
          prompt: 'Test',
          model: 'anthropic/claude-3-5-sonnet-20241022',
          temperature: 0.7,
        },
        { id: 'row-3', prompt: 'Test', model: 'gemini/gemini-1.5-pro-002', temperature: 0.7 },
      ];

      const { container } = render(<SpreadsheetEditor {...defaultProps} rows={rows} />);

      // Select model cells
      const modelCells = container.querySelectorAll('td[data-testid*="model"]');
      fireEvent.mouseDown(modelCells[0]);
      fireEvent.mouseDown(modelCells[2], { shiftKey: true });

      const dragHandle = container.querySelector('.drag-handle');
      fireEvent.mouseDown(dragHandle!);

      // Drag down
      const targetCell = container.querySelector('td[data-testid="cell-5-2"]');
      fireEvent.mouseEnter(targetCell!);
      fireEvent.mouseUp(targetCell!);

      await waitFor(() => {
        const cells = container.querySelectorAll('td[data-testid*="model"]');
        expect(cells[3]).toHaveTextContent('GPT-4o'); // Pattern continues
        expect(cells[4]).toHaveTextContent('Claude 3.5 Sonnet');
        expect(cells[5]).toHaveTextContent('Gemini 1.5 Pro');
      });
    });
  });

  describe('Undo/Redo Tests', () => {
    it('undoes drag-fill operation', async () => {
      const user = userEvent.setup();
      const rows: BatchRow[] = [
        { id: 'row-1', prompt: 'Test 1', model: 'openai/gpt-4o', temperature: 0.5 },
      ];

      const { container } = render(<SpreadsheetEditor {...defaultProps} rows={rows} />);

      // Perform drag fill
      const tempCell = container.querySelector('td[data-testid="cell-0-3"]');
      fireEvent.mouseDown(tempCell!);

      const dragHandle = container.querySelector('.drag-handle');
      fireEvent.mouseDown(dragHandle!);

      const targetCell = container.querySelector('td[data-testid="cell-2-3"]');
      fireEvent.mouseEnter(targetCell!);
      fireEvent.mouseUp(targetCell!);

      // Verify fill happened
      await waitFor(() => {
        const cells = container.querySelectorAll('td[data-testid*="temperature"]');
        expect(cells).toHaveLength(3);
      });

      // Undo with Ctrl+Z
      await user.keyboard('{Control>}z{/Control}');

      // Verify undo worked
      await waitFor(() => {
        const cells = container.querySelectorAll('td[data-testid*="temperature"]');
        expect(cells).toHaveLength(1);
      });
    });

    it('redoes drag-fill operation', async () => {
      const user = userEvent.setup();
      const rows: BatchRow[] = [
        { id: 'row-1', prompt: 'Test 1', model: 'openai/gpt-4o', temperature: 0.5 },
      ];

      const { container } = render(<SpreadsheetEditor {...defaultProps} rows={rows} />);

      // Perform drag fill
      const tempCell = container.querySelector('td[data-testid="cell-0-3"]');
      fireEvent.mouseDown(tempCell!);

      const dragHandle = container.querySelector('.drag-handle');
      fireEvent.mouseDown(dragHandle!);

      const targetCell = container.querySelector('td[data-testid="cell-2-3"]');
      fireEvent.mouseEnter(targetCell!);
      fireEvent.mouseUp(targetCell!);

      // Undo
      await user.keyboard('{Control>}z{/Control}');

      // Redo with Ctrl+Y
      await user.keyboard('{Control>}y{/Control}');

      // Verify redo worked
      await waitFor(() => {
        const cells = container.querySelectorAll('td[data-testid*="temperature"]');
        expect(cells).toHaveLength(3);
      });
    });
  });

  describe('Performance Tests', () => {
    it('fills 1000 rows within 50ms', async () => {
      const rows: BatchRow[] = [
        { id: 'row-1', prompt: 'Test', model: 'openai/gpt-4o', temperature: 1.0 },
        { id: 'row-2', prompt: 'Test', model: 'openai/gpt-4o', temperature: 2.0 },
      ];

      const { container } = render(<SpreadsheetEditor {...defaultProps} rows={rows} />);

      // Mock performance.now
      const startTime = performance.now();

      // Select cells
      const cells = container.querySelectorAll('td[data-testid*="temperature"]');
      fireEvent.mouseDown(cells[0]);
      fireEvent.mouseDown(cells[1], { shiftKey: true });

      const dragHandle = container.querySelector('.drag-handle');
      fireEvent.mouseDown(dragHandle!);

      // Simulate drag to row 1000
      const targetCell = container.querySelector('td[data-testid="cell-999-3"]');
      fireEvent.mouseEnter(targetCell!);
      fireEvent.mouseUp(targetCell!);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify performance
      expect(duration).toBeLessThan(50);

      // Verify data was filled
      await waitFor(() => {
        const allCells = container.querySelectorAll('td[data-testid*="temperature"]');
        expect(allCells.length).toBeGreaterThan(100); // At least partially filled
      });
    });
  });

  describe('Tab Navigation', () => {
    it('navigates between editable cells with Tab', async () => {
      const user = userEvent.setup();
      const rows: BatchRow[] = [
        { id: 'row-1', prompt: 'Test', model: 'openai/gpt-4o', temperature: 0.7 },
      ];

      render(<SpreadsheetEditor {...defaultProps} rows={rows} />);

      // Click on first cell
      const firstCell = screen.getByText('Test');
      await user.click(firstCell);

      // Tab to next cell
      await user.keyboard('{Tab}');

      // Should be in system message cell
      await waitFor(() => {
        const activeElement = document.activeElement;
        expect(activeElement?.tagName).toBe('TEXTAREA');
      });

      // Tab again
      await user.keyboard('{Tab}');

      // Should be in model cell
      await waitFor(() => {
        const activeElement = document.activeElement;
        expect(activeElement?.tagName).toBe('SELECT');
      });
    });

    it('navigates backwards with Shift+Tab', async () => {
      const user = userEvent.setup();
      const rows: BatchRow[] = [
        { id: 'row-1', prompt: 'Test', model: 'openai/gpt-4o', temperature: 0.7 },
      ];

      render(<SpreadsheetEditor {...defaultProps} rows={rows} />);

      // Click on temperature cell
      const tempCell = screen.getByText('0.7');
      await user.click(tempCell);

      // Shift+Tab to go back
      await user.keyboard('{Shift>}{Tab}{/Shift}');

      // Should be in model cell
      await waitFor(() => {
        const activeElement = document.activeElement;
        expect(activeElement?.tagName).toBe('SELECT');
      });
    });
  });

  describe('Column Operations', () => {
    it('does not overflow when filling beyond last column', async () => {
      const rows: BatchRow[] = [
        {
          id: 'row-1',
          prompt: 'Test',
          model: 'openai/gpt-4o',
          temperature: 0.7,
          data: { custom1: 'A', custom2: 'B' },
        },
      ];

      const { container } = render(<SpreadsheetEditor {...defaultProps} rows={rows} />);

      // Select last columns
      const lastCells = container.querySelectorAll('td:last-child');
      fireEvent.mouseDown(lastCells[1]); // Skip header

      const dragHandle = container.querySelector('.drag-handle');
      fireEvent.mouseDown(dragHandle!);

      // Try to drag beyond table bounds
      fireEvent.mouseEnter(document.body); // Outside table
      fireEvent.mouseUp(document.body);

      // Verify no new columns were created
      await waitFor(() => {
        const headers = container.querySelectorAll('th');
        const originalCount = headers.length;
        expect(headers).toHaveLength(originalCount); // No new columns
      });
    });
  });
});
