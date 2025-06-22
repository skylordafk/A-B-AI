import type { BatchRow } from '../../types/batch';
import { getCellValue, setCellValueInRow, createEmptyRow, type Column } from './spreadsheetUtils';
import type { CellSelection } from './dragFillUtils';

export async function copySelection(
  rows: BatchRow[],
  selection: CellSelection,
  allColumns: Column[],
  selectionMode: 'cell' | 'column' | 'row'
): Promise<void> {
  const { startRow, startCol, endRow, endCol } = selection;
  const data: string[][] = [];

  if (selectionMode === 'column') {
    // Copy entire columns
    for (let r = 0; r < rows.length; r++) {
      const rowData: string[] = [];
      for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
        rowData.push(getCellValue(rows[r], allColumns[c].key));
      }
      data.push(rowData);
    }
  } else if (selectionMode === 'row') {
    // Copy entire rows - include all columns
    for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
      const rowData: string[] = [];
      for (let c = 0; c < allColumns.length; c++) {
        rowData.push(getCellValue(rows[r], allColumns[c].key));
      }
      data.push(rowData);
    }
  } else {
    // Normal cell selection - copy all cells regardless of editable status
    for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
      const rowData: string[] = [];
      for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
        rowData.push(getCellValue(rows[r], allColumns[c].key));
      }
      data.push(rowData);
    }
  }

  const text = data.map((row) => row.join('\t')).join('\n');
  await navigator.clipboard.writeText(text);
}

export async function pasteClipboard(
  rows: BatchRow[],
  selection: CellSelection,
  allColumns: Column[]
): Promise<BatchRow[]> {
  try {
    const text = await navigator.clipboard.readText();
    const lines = text.split('\n').filter((line) => line.trim());
    const data = lines.map((line) => line.split('\t'));

    const { startRow, startCol } = selection;
    const newRows = [...rows];

    data.forEach((rowData, i) => {
      const targetRow = startRow + i;

      // Add new rows if needed (expand rows but not columns)
      while (targetRow >= newRows.length) {
        newRows.push(createEmptyRow(`row-${newRows.length + 1}`));
      }

      // Ensure row has data object
      if (!newRows[targetRow].data) {
        newRows[targetRow].data = {};
      }

      rowData.forEach((cellValue, j) => {
        const targetCol = startCol + j;

        // Stop if we run out of columns (don't expand columns)
        if (targetCol >= allColumns.length) return;

        const col = allColumns[targetCol];
        const colKey = col.key;

        // Handle all column types including dynamic ones
        if (colKey === 'jsonMode') {
          // Normalize boolean parsing
          const normalizedValue = cellValue.toLowerCase();
          newRows[targetRow].data = newRows[targetRow].data || {};
          newRows[targetRow].data.jsonMode =
            normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'yes';
        } else if (colKey === 'jsonSchema') {
          newRows[targetRow].data = newRows[targetRow].data || {};
          newRows[targetRow].data.jsonSchema = cellValue;
        } else if (col.isDynamic) {
          newRows[targetRow].data = newRows[targetRow].data || {};
          newRows[targetRow].data[colKey] = cellValue;
        } else {
          switch (colKey) {
            case 'temperature': {
              const temp = parseFloat(cellValue);
              newRows[targetRow].temperature = isNaN(temp) ? 0.7 : Math.min(2, Math.max(0, temp));
              break;
            }
            case 'prompt':
              newRows[targetRow].prompt = cellValue || '';
              break;
            case 'system':
              newRows[targetRow].system = cellValue || undefined;
              break;
            case 'model':
              newRows[targetRow].model = cellValue || undefined;
              break;
          }
        }
      });
    });

    return newRows;
  } catch (err) {
    console.error('Failed to paste:', err);
    return rows;
  }
}

export function deleteSelection(
  rows: BatchRow[],
  selection: CellSelection,
  allColumns: Column[]
): BatchRow[] {
  const { startRow, startCol, endRow, endCol } = selection;
  const newRows = [...rows];

  for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
    for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
      if (allColumns[c].editable) {
        newRows[r] = setCellValueInRow(newRows[r], allColumns[c].key, '', allColumns);
      }
    }
  }

  return newRows;
}
