import type { BatchRow } from '../../types/batch';
import type { Column, CellSelection } from './spreadsheetUtils';
import { getCellValue, setCellValueInRow } from './spreadsheetUtils';

// Multi-cell editing operations
export interface MultiCellOperation {
  type: 'fill' | 'replace' | 'append' | 'prepend' | 'clear';
  value: string;
  targetField?: string;
}

// Apply operation to multiple cells
export function applyMultiCellOperation(
  rows: BatchRow[],
  selection: CellSelection,
  operation: MultiCellOperation,
  columns: Column[]
): BatchRow[] {
  const { startRow, endRow, startCol, endCol } = normalizeSelection(selection);
  const newRows = [...rows];

  for (let rowIdx = startRow; rowIdx <= endRow; rowIdx++) {
    for (let colIdx = startCol; colIdx <= endCol; colIdx++) {
      if (rowIdx >= rows.length || colIdx >= columns.length) continue;

      const column = columns[colIdx];
      if (!column.editable) continue;

      const currentValue = getCellValue(rows[rowIdx], column.key);
      let newValue: string;

      switch (operation.type) {
        case 'fill':
          newValue = operation.value;
          break;
        case 'replace':
          newValue = currentValue.replace(
            new RegExp(operation.targetField || '', 'gi'),
            operation.value
          );
          break;
        case 'append':
          newValue = currentValue + operation.value;
          break;
        case 'prepend':
          newValue = operation.value + currentValue;
          break;
        case 'clear':
          newValue = '';
          break;
        default:
          continue;
      }

      newRows[rowIdx] = setCellValueInRow(newRows[rowIdx], column.key, newValue, columns);
    }
  }

  return newRows;
}

// Bulk model change
export function bulkChangeModel(
  rows: BatchRow[],
  newModel: string,
  selectedRows?: number[]
): BatchRow[] {
  return rows.map((row, index) => {
    if (selectedRows && !selectedRows.includes(index)) return row;
    return { ...row, model: newModel };
  });
}

// Bulk temperature change
export function bulkChangeTemperature(
  rows: BatchRow[],
  newTemperature: number,
  selectedRows?: number[]
): BatchRow[] {
  return rows.map((row, index) => {
    if (selectedRows && !selectedRows.includes(index)) return row;
    return { ...row, temperature: newTemperature };
  });
}

// Fill down operation (copy value from first cell to all selected cells)
export function fillDown(
  rows: BatchRow[],
  selection: CellSelection,
  columns: Column[]
): BatchRow[] {
  const { startRow, endRow, startCol, endCol } = normalizeSelection(selection);
  const newRows = [...rows];

  for (let colIdx = startCol; colIdx <= endCol; colIdx++) {
    if (colIdx >= columns.length) continue;

    const column = columns[colIdx];
    if (!column.editable) continue;

    const sourceValue = getCellValue(rows[startRow], column.key);

    for (let rowIdx = startRow + 1; rowIdx <= endRow; rowIdx++) {
      if (rowIdx >= rows.length) continue;
      newRows[rowIdx] = setCellValueInRow(newRows[rowIdx], column.key, sourceValue, columns);
    }
  }

  return newRows;
}

// Auto-increment operation (for numeric sequences)
export function autoIncrement(
  rows: BatchRow[],
  selection: CellSelection,
  columns: Column[]
): BatchRow[] {
  const { startRow, endRow, startCol, endCol } = normalizeSelection(selection);
  const newRows = [...rows];

  for (let colIdx = startCol; colIdx <= endCol; colIdx++) {
    if (colIdx >= columns.length) continue;

    const column = columns[colIdx];
    if (!column.editable) continue;

    const firstValue = getCellValue(rows[startRow], column.key);
    const secondValue = startRow + 1 <= endRow ? getCellValue(rows[startRow + 1], column.key) : '';

    // Try to detect numeric pattern
    const firstNum = parseFloat(firstValue);
    const secondNum = parseFloat(secondValue);

    if (!isNaN(firstNum)) {
      const increment = !isNaN(secondNum) ? secondNum - firstNum : 1;

      for (let rowIdx = startRow; rowIdx <= endRow; rowIdx++) {
        if (rowIdx >= rows.length) continue;
        const newValue = (firstNum + (rowIdx - startRow) * increment).toString();
        newRows[rowIdx] = setCellValueInRow(newRows[rowIdx], column.key, newValue, columns);
      }
    }
  }

  return newRows;
}

// Find and replace operation
export function findAndReplace(
  rows: BatchRow[],
  findText: string,
  replaceText: string,
  options: {
    matchCase?: boolean;
    wholeWord?: boolean;
    useRegex?: boolean;
    selectedRowsOnly?: number[];
    selectedColumnsOnly?: string[];
  } = {}
): { rows: BatchRow[]; matchCount: number } {
  const newRows = [...rows];
  let matchCount = 0;

  const flags = options.matchCase ? 'g' : 'gi';
  const pattern = options.useRegex
    ? new RegExp(findText, flags)
    : options.wholeWord
      ? new RegExp(`\\b${escapeRegExp(findText)}\\b`, flags)
      : new RegExp(escapeRegExp(findText), flags);

  newRows.forEach((row, rowIndex) => {
    if (options.selectedRowsOnly && !options.selectedRowsOnly.includes(rowIndex)) return;

    // Check main fields
    const fields = ['prompt', 'system', 'model'];
    fields.forEach((field) => {
      if (options.selectedColumnsOnly && !options.selectedColumnsOnly.includes(field)) return;

      const currentValue = (row as any)[field] || '';
      if (typeof currentValue === 'string' && pattern.test(currentValue)) {
        const newValue = currentValue.replace(pattern, replaceText);
        (newRows[rowIndex] as any)[field] = newValue;
        matchCount += (currentValue.match(pattern) || []).length;
      }
    });

    // Check dynamic data fields
    if (row.data) {
      Object.keys(row.data).forEach((key) => {
        if (options.selectedColumnsOnly && !options.selectedColumnsOnly.includes(key)) return;

        const currentValue = row.data![key];
        if (typeof currentValue === 'string' && pattern.test(currentValue)) {
          const newValue = currentValue.replace(pattern, replaceText);
          newRows[rowIndex] = {
            ...newRows[rowIndex],
            data: { ...newRows[rowIndex].data, [key]: newValue },
          };
          matchCount += (currentValue.match(pattern) || []).length;
        }
      });
    }
  });

  return { rows: newRows, matchCount };
}

// Helper function to normalize selection bounds
function normalizeSelection(selection: CellSelection): {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
} {
  return {
    startRow: Math.min(selection.startRow, selection.endRow),
    endRow: Math.max(selection.startRow, selection.endRow),
    startCol: Math.min(selection.startCol, selection.endCol),
    endCol: Math.max(selection.startCol, selection.endCol),
  };
}

// Helper function to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Auto-suggestion system for common prompts
export const PROMPT_SUGGESTIONS = [
  'Explain the concept of',
  'Write a detailed analysis of',
  'Summarize the key points about',
  'Compare and contrast',
  'Create a step-by-step guide for',
  'List the advantages and disadvantages of',
  'Describe the process of',
  'What are the best practices for',
  'Generate creative ideas for',
  'Provide examples of',
];

export const MODEL_SUGGESTIONS = [
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/gpt-4.1',
  'anthropic/claude-3-7-sonnet-20250219',
  'anthropic/claude-3.5-haiku-20241022',
  'anthropic/claude-4-opus',
  'anthropic/claude-4-sonnet',
  'gemini/gemini-1.5-pro',
  'gemini/gemini-1.5-flash',
  'grok/grok-3',
  'grok/grok-3-mini',
];

// Auto-completion for prompt patterns
export function getPromptSuggestions(currentText: string): string[] {
  const text = currentText.toLowerCase();
  return PROMPT_SUGGESTIONS.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(text) ||
      text.includes(suggestion.toLowerCase().substring(0, 3))
  ).slice(0, 5);
}

// Auto-completion for model names
export function getModelSuggestions(currentText: string): string[] {
  const text = currentText.toLowerCase();
  return MODEL_SUGGESTIONS.filter((model) => model.toLowerCase().includes(text)).slice(0, 8);
}
