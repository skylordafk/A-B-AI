import type { BatchRow } from '../../types/batch';

export interface Column {
  key: string;
  label: string;
  width: string;
  editable: boolean;
  isDynamic?: boolean;
}

// Fixed columns that are always present
export const FIXED_INPUT_COLUMNS: Column[] = [
  { key: 'prompt', label: 'Prompt', width: '300px', editable: true },
  { key: 'system', label: 'System Message', width: '200px', editable: true },
  { key: 'model', label: 'Model', width: '180px', editable: true },
  { key: 'temperature', label: 'Temperature', width: '100px', editable: true },
  { key: 'jsonSchema', label: 'JSON Schema', width: '200px', editable: true },
];

export const OUTPUT_COLUMNS: Column[] = [
  { key: 'status', label: 'Status', width: '100px', editable: false },
  { key: 'response', label: 'Response', width: '300px', editable: false },
  { key: 'cost_usd', label: 'Cost ($)', width: '80px', editable: false },
  { key: 'latency_ms', label: 'Latency (ms)', width: '100px', editable: false },
  { key: 'error', label: 'Error', width: '200px', editable: false },
];

export const RESERVED_KEYS = [
  'prompt',
  'system',
  'model',
  'temperature',
  'jsonSchema',
  'status',
  'response',
  'cost_usd',
  'latency_ms',
  'error',
];

export const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
  { value: 'o3', label: 'o3' },
  { value: 'o3-mini', label: 'o3 Mini' },
  { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
  { value: 'claude-4-sonnet', label: 'Claude 4 Sonnet' },
  { value: 'claude-4-opus', label: 'Claude 4 Opus' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  { value: 'grok-3', label: 'Grok 3' },
  { value: 'grok-3-mini', label: 'Grok 3 Mini' },
  { value: 'models/gemini-2.5-pro-thinking', label: 'Gemini 2.5 Pro Thinking' },
  { value: 'models/gemini-2.5-flash-preview', label: 'Gemini 2.5 Flash Preview' },
];

export function getCellValue(row: BatchRow, colKey: string): string {
  if (colKey === 'jsonSchema') {
    return (row.data?.jsonSchema as string) || '';
  }
  // Check if it's a dynamic column
  if (row.data && colKey in row.data && !RESERVED_KEYS.includes(colKey)) {
    return (row.data[colKey] as string) || '';
  }
  const value = row[colKey as keyof BatchRow];
  return value?.toString() || '';
}

export function setCellValueInRow(
  row: BatchRow,
  colKey: string,
  value: string,
  allColumns: Column[]
): BatchRow {
  const newRow = { ...row };

  // Handle special columns
  if (colKey === 'jsonSchema') {
    newRow.data = { ...newRow.data, jsonSchema: value };
  } else {
    // Check if it's a dynamic column
    const column = allColumns.find((col) => col.key === colKey);
    if (column?.isDynamic) {
      newRow.data = { ...newRow.data, [colKey]: value };
    } else {
      // Handle fixed columns
      switch (colKey) {
        case 'temperature': {
          const temp = parseFloat(value);
          newRow.temperature = isNaN(temp) ? undefined : temp;
          break;
        }
        case 'prompt':
          newRow.prompt = value || '';
          break;
        case 'system':
          newRow.system = value || undefined;
          break;
        case 'model':
          newRow.model = value || undefined;
          break;
      }
    }
  }

  return newRow;
}

export function createEmptyRow(id: string): BatchRow {
  return {
    id,
    prompt: '',
    model: 'gpt-4o',
    temperature: 0.7,
    data: {},
  };
}

export function normalizeRows(rows: BatchRow[], dynamicColumns: Column[]): BatchRow[] {
  return rows.map((row) => {
    const normalizedRow = { ...row };

    // Ensure data object exists
    if (!normalizedRow.data) {
      normalizedRow.data = {};
    }

    // Ensure all dynamic columns have values (even if empty)
    dynamicColumns.forEach((col) => {
      if (normalizedRow.data![col.key] === undefined) {
        normalizedRow.data![col.key] = '';
      }
    });

    // Ensure consistent data types
    if (normalizedRow.temperature === undefined) {
      normalizedRow.temperature = 0.7;
    }
    if (!normalizedRow.prompt) {
      normalizedRow.prompt = '';
    }
    if (!normalizedRow.model) {
      normalizedRow.model = 'gpt-4o';
    }

    return normalizedRow;
  });
}

export function exportToCSV(
  rows: BatchRow[],
  allColumns: Column[],
  dynamicColumns: Column[],
  fileName?: string
): void {
  // Normalize all rows to include all dynamic columns
  const normalizedRows = normalizeRows(rows, dynamicColumns);

  // Use standardized column names for CSV export
  const columnKeyMap: Record<string, string> = {
    jsonSchema: 'json_schema',
  };

  const headers = allColumns
    .map((col) => {
      // Use standardized names for special columns
      if (columnKeyMap[col.key]) {
        return columnKeyMap[col.key];
      }
      // For dynamic columns, convert to snake_case
      if (col.isDynamic) {
        return col.key.toLowerCase().replace(/\s+/g, '_');
      }
      // For other columns, use the key directly
      return col.key;
    })
    .join(',');

  const csvRows = normalizedRows.map((row) => {
    return allColumns
      .map((col) => {
        const value = getCellValue(row, col.key);
        // Escape quotes and wrap in quotes if contains comma or newline
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',');
  });

  const csv = [headers, ...csvRows].join('\n');

  // Download the CSV
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'batch-data.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// Get the next editable cell for Tab navigation
export function getNextEditableCell(
  currentRow: number,
  currentCol: number,
  allColumns: Column[],
  rowCount: number,
  direction: 'forward' | 'backward'
): { row: number; col: number } | null {
  const editableCols = allColumns
    .map((col, idx) => ({ col, idx }))
    .filter(({ col }) => col.editable);

  if (editableCols.length === 0) return null;

  const currentEditableIdx = editableCols.findIndex(({ idx }) => idx === currentCol);

  if (direction === 'forward') {
    // If we're at an editable column
    if (currentEditableIdx !== -1) {
      // Move to next editable column
      if (currentEditableIdx < editableCols.length - 1) {
        return { row: currentRow, col: editableCols[currentEditableIdx + 1].idx };
      }
      // Move to first editable column of next row
      if (currentRow < rowCount - 1) {
        return { row: currentRow + 1, col: editableCols[0].idx };
      }
    } else {
      // Find next editable column in current row
      const nextEditable = editableCols.find(({ idx }) => idx > currentCol);
      if (nextEditable) {
        return { row: currentRow, col: nextEditable.idx };
      }
      // Move to next row
      if (currentRow < rowCount - 1) {
        return { row: currentRow + 1, col: editableCols[0].idx };
      }
    }
  } else {
    // Backward navigation
    if (currentEditableIdx !== -1) {
      // Move to previous editable column
      if (currentEditableIdx > 0) {
        return { row: currentRow, col: editableCols[currentEditableIdx - 1].idx };
      }
      // Move to last editable column of previous row
      if (currentRow > 0) {
        return { row: currentRow - 1, col: editableCols[editableCols.length - 1].idx };
      }
    } else {
      // Find previous editable column in current row
      const prevEditable = [...editableCols].reverse().find(({ idx }) => idx < currentCol);
      if (prevEditable) {
        return { row: currentRow, col: prevEditable.idx };
      }
      // Move to previous row
      if (currentRow > 0) {
        return { row: currentRow - 1, col: editableCols[editableCols.length - 1].idx };
      }
    }
  }

  return null;
}
