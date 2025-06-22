import type { BatchRow } from '../../types/batch';
import { getCellValue, setCellValueInRow, createEmptyRow, type Column } from './spreadsheetUtils';

export interface CellSelection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface DragPreview {
  row: number;
  col: number;
}

type FillDirection =
  | 'down'
  | 'up'
  | 'right'
  | 'left'
  | 'diagonal-down-right'
  | 'diagonal-down-left'
  | 'diagonal-up-right'
  | 'diagonal-up-left';

function isNumeric(value: string): boolean {
  return !isNaN(parseFloat(value)) && isFinite(Number(value));
}

function detectFillDirection(selection: CellSelection, dragTo: DragPreview): FillDirection | null {
  const { startRow, endRow, startCol, endCol } = selection;
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  const { row: dragRow, col: dragCol } = dragTo;

  // Vertical fill
  if (dragCol >= minCol && dragCol <= maxCol) {
    if (dragRow > maxRow) return 'down';
    if (dragRow < minRow) return 'up';
  }

  // Horizontal fill
  if (dragRow >= minRow && dragRow <= maxRow) {
    if (dragCol > maxCol) return 'right';
    if (dragCol < minCol) return 'left';
  }

  // Diagonal fill
  if (dragRow > maxRow && dragCol > maxCol) return 'diagonal-down-right';
  if (dragRow > maxRow && dragCol < minCol) return 'diagonal-down-left';
  if (dragRow < minRow && dragCol > maxCol) return 'diagonal-up-right';
  if (dragRow < minRow && dragCol < minCol) return 'diagonal-up-left';

  return null;
}

interface NumericPattern {
  isNumeric: true;
  values: number[];
  delta: number;
}

interface TextPattern {
  isNumeric: false;
  values: string[];
}

type Pattern = NumericPattern | TextPattern;

function analyzeSelectionPattern(
  rows: BatchRow[],
  selection: CellSelection,
  allColumns: Column[],
  direction: FillDirection
): Pattern[] {
  const { startRow, endRow, startCol, endCol } = selection;
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  const patterns: Pattern[] = [];

  // Analyze each column in the selection
  for (let col = minCol; col <= maxCol; col++) {
    if (!allColumns[col].editable) continue;

    const colValues: string[] = [];
    for (let row = minRow; row <= maxRow; row++) {
      colValues.push(getCellValue(rows[row], allColumns[col].key));
    }

    // Check if all values are numeric
    const numericValues = colValues.map((v) => parseFloat(v));
    const allNumeric = colValues.every(isNumeric) && numericValues.every((n) => !isNaN(n));

    if (allNumeric) {
      // Calculate delta based on direction
      let delta = 0;

      if (colValues.length === 1) {
        // Single cell - repeat same number
        delta = 0;
      } else {
        // Multi-cell - calculate delta from edge aligned with drag direction
        if (
          direction === 'down' ||
          direction === 'diagonal-down-right' ||
          direction === 'diagonal-down-left'
        ) {
          // Use bottom edge
          delta = numericValues[numericValues.length - 1] - numericValues[numericValues.length - 2];
        } else if (
          direction === 'up' ||
          direction === 'diagonal-up-right' ||
          direction === 'diagonal-up-left'
        ) {
          // Use top edge
          delta = numericValues[0] - numericValues[1];
        } else if (direction === 'right') {
          // For horizontal, use average delta
          delta =
            numericValues.length > 1
              ? (numericValues[numericValues.length - 1] - numericValues[0]) /
                (numericValues.length - 1)
              : 0;
        } else if (direction === 'left') {
          // For horizontal left, use negative delta
          delta =
            numericValues.length > 1
              ? -(numericValues[numericValues.length - 1] - numericValues[0]) /
                (numericValues.length - 1)
              : 0;
        }
      }

      patterns.push({
        isNumeric: true,
        values: numericValues,
        delta,
      });
    } else {
      // Text pattern - simple repeat
      patterns.push({
        isNumeric: false,
        values: colValues,
      });
    }
  }

  return patterns;
}

export function performDragFill(
  rows: BatchRow[],
  selection: CellSelection,
  dragPreview: DragPreview,
  allColumns: Column[]
): BatchRow[] {
  const direction = detectFillDirection(selection, dragPreview);
  if (!direction) return rows;

  const startTime = performance.now();

  const { startRow, endRow, startCol, endCol } = selection;
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  // Analyze patterns in selection
  const patterns = analyzeSelectionPattern(rows, selection, allColumns, direction);

  // Clone rows for modification
  const newRows = [...rows];

  // Calculate fill bounds
  let fillStartRow = minRow;
  let fillEndRow = maxRow;
  let fillStartCol = minCol;
  let fillEndCol = maxCol;

  switch (direction) {
    case 'down':
      fillStartRow = maxRow + 1;
      fillEndRow = dragPreview.row;
      break;
    case 'up':
      fillStartRow = dragPreview.row;
      fillEndRow = minRow - 1;
      break;
    case 'right':
      fillStartCol = maxCol + 1;
      fillEndCol = Math.min(dragPreview.col, allColumns.length - 1); // Prevent overflow
      break;
    case 'left':
      fillStartCol = Math.max(0, dragPreview.col);
      fillEndCol = minCol - 1;
      break;
    case 'diagonal-down-right':
      fillStartRow = maxRow + 1;
      fillEndRow = dragPreview.row;
      fillStartCol = maxCol + 1;
      fillEndCol = Math.min(dragPreview.col, allColumns.length - 1);
      break;
    case 'diagonal-down-left':
      fillStartRow = maxRow + 1;
      fillEndRow = dragPreview.row;
      fillStartCol = Math.max(0, dragPreview.col);
      fillEndCol = minCol - 1;
      break;
    case 'diagonal-up-right':
      fillStartRow = dragPreview.row;
      fillEndRow = minRow - 1;
      fillStartCol = maxCol + 1;
      fillEndCol = Math.min(dragPreview.col, allColumns.length - 1);
      break;
    case 'diagonal-up-left':
      fillStartRow = dragPreview.row;
      fillEndRow = minRow - 1;
      fillStartCol = Math.max(0, dragPreview.col);
      fillEndCol = minCol - 1;
      break;
  }

  // Ensure we have enough rows
  while (fillEndRow >= newRows.length) {
    newRows.push(createEmptyRow(`row-${newRows.length + 1}`));
  }

  // Fill cells
  let patternOffset = 0;

  for (let row = fillStartRow; row <= fillEndRow; row++) {
    for (let col = fillStartCol; col <= fillEndCol; col++) {
      // Map column to pattern index
      const patternIdx = col - minCol;
      if (patternIdx < 0 || patternIdx >= patterns.length) continue;

      const pattern = patterns[patternIdx];
      const column = allColumns[col];

      if (!column.editable) continue;

      // Ensure row has data object
      if (!newRows[row].data) {
        newRows[row].data = {};
      }

      let value: string;

      if ('isNumeric' in pattern && pattern.isNumeric) {
        // Smart increment for numeric patterns
        const baseValue = pattern.values[pattern.values.length - 1];
        const increment = pattern.delta * (patternOffset + 1);
        value = (baseValue + increment).toString();
      } else {
        // Text pattern - repeat
        const idx = patternOffset % pattern.values.length;
        value = pattern.values[idx];
      }

      newRows[row] = setCellValueInRow(newRows[row], column.key, value, allColumns);
    }

    patternOffset++;
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  // Log performance warning if it took too long
  if (duration > 50) {
    console.warn(
      `Drag fill took ${duration.toFixed(2)}ms for ${fillEndRow - fillStartRow + 1} rows`
    );
  }

  return newRows;
}

export function getDragHandlePosition(selection: CellSelection): { row: number; col: number } {
  return {
    row: selection.endRow,
    col: selection.endCol,
  };
}
