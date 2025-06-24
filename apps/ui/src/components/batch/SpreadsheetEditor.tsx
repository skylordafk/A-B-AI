import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import type { BatchRow } from '../../types/batch';
import {
  FIXED_INPUT_COLUMNS,
  OUTPUT_COLUMNS,
  MODELS,
  RESERVED_KEYS,
  getCellValue,
  setCellValueInRow,
  createEmptyRow,
  normalizeRows,
  exportToCSV,
  getNextEditableCell,
  type Column,
} from '../../lib/batch/spreadsheetUtils';
import {
  performDragFill,
  type CellSelection,
  type DragPreview,
} from '../../lib/batch/dragFillUtils';
import { copySelection, pasteClipboard, deleteSelection } from '../../lib/batch/clipboardUtils';
import { estimateCost, type CostEstimation } from '../../lib/batch/estimateCost';
import { parseSmartCSV, generateInitialRows } from '../../lib/batch/smartCsvImport';
import {
  bulkChangeTemperature,
  fillDown,
  findAndReplace,
  getPromptSuggestions,
  getModelSuggestions,
} from '../../lib/batch/multiCellOperations';
import '../../styles/spreadsheet.css';
import { useProjectStore } from '../../store/projectStore';

// Extended BatchRow type that includes execution results
type ExtendedBatchRow = BatchRow & {
  status?: string;
  response?: string;
  cost_usd?: number;
  latency_ms?: number;
  error?: string;
};

// Re-implement formatters locally
function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.000001) return '<$0.000001';
  return `$${cost.toFixed(6)}`;
}

function formatTokens(tokens: number): string {
  return tokens.toLocaleString();
}

interface SpreadsheetEditorProps {
  rows: BatchRow[];
  onSave: (rows: BatchRow[]) => void;
  onCancel: () => void;
  fileName?: string;
  jobResults?: Map<string, any>;
  currentJobId?: string;
}

// Unified state interface
interface SpreadsheetState {
  rows: ExtendedBatchRow[];
  dynamicColumns: Column[];
  selection: CellSelection | null;
  editing: {
    cell: { row: number; col: number } | null;
    value: string;
  };
  interaction: {
    isSelecting: boolean;
    isDragging: boolean;
    dragPreview: DragPreview | null;
    dragPreviewCells: Array<{ row: number; col: number }>;
    selectionMode: 'cell' | 'column' | 'row';
  };
  ui: {
    editingColumnName: number | null;
    columnWidths: Record<string, string>;
    resizing: {
      column: number | null;
      startX: number;
      startWidth: number;
    };
    suggestions: {
      visible: boolean;
      items: string[];
      selectedIndex: number;
      position: { x: number; y: number };
    };
    contextMenu: {
      visible: boolean;
      position: { x: number; y: number };
      selection: CellSelection | null;
    };
  };
  costs: {
    rowCosts: Map<string, { totalCost: number; inputTokens: number }>;
    batchTotal: CostEstimation;
    isCalculating: boolean;
  };
  history: {
    states: { rows: ExtendedBatchRow[]; columns: Column[] }[];
    index: number;
  };
}

// Action types for the reducer
type SpreadsheetAction =
  | { type: 'SET_ROWS'; rows: ExtendedBatchRow[] }
  | { type: 'SET_DYNAMIC_COLUMNS'; columns: Column[] }
  | { type: 'SET_SELECTION'; selection: CellSelection | null }
  | { type: 'START_EDITING'; row: number; col: number; value: string }
  | { type: 'UPDATE_EDIT_VALUE'; value: string }
  | { type: 'FINISH_EDITING' }
  | { type: 'CANCEL_EDITING' }
  | { type: 'SET_INTERACTION'; field: keyof SpreadsheetState['interaction']; value: any }
  | { type: 'SET_UI'; field: keyof SpreadsheetState['ui']; value: any }
  | { type: 'START_COLUMN_RESIZE'; column: number; startX: number; startWidth: number }
  | { type: 'UPDATE_COLUMN_WIDTH'; column: string; width: string }
  | { type: 'FINISH_COLUMN_RESIZE' }
  | { type: 'UPDATE_ROW_COST'; rowId: string; cost: { totalCost: number; inputTokens: number } }
  | { type: 'UPDATE_BATCH_TOTAL'; total: CostEstimation }
  | { type: 'SET_CALCULATING'; isCalculating: boolean }
  | { type: 'SHOW_SUGGESTIONS'; items: string[]; position: { x: number; y: number } }
  | { type: 'HIDE_SUGGESTIONS' }
  | { type: 'UPDATE_SUGGESTION_SELECTION'; index: number }
  | { type: 'SHOW_CONTEXT_MENU'; position: { x: number; y: number }; selection: CellSelection }
  | { type: 'HIDE_CONTEXT_MENU' }
  | { type: 'SET_DRAG_PREVIEW_CELLS'; cells: Array<{ row: number; col: number }> }
  | { type: 'SAVE_TO_HISTORY'; rows: ExtendedBatchRow[]; columns: Column[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET_STATE'; rows: ExtendedBatchRow[]; columns: Column[] };

// State reducer
function spreadsheetReducer(state: SpreadsheetState, action: SpreadsheetAction): SpreadsheetState {
  switch (action.type) {
    case 'SET_ROWS':
      return { ...state, rows: action.rows };

    case 'SET_DYNAMIC_COLUMNS':
      return { ...state, dynamicColumns: action.columns };

    case 'SET_SELECTION':
      return { ...state, selection: action.selection };

    case 'START_EDITING':
      return {
        ...state,
        editing: { cell: { row: action.row, col: action.col }, value: action.value },
        selection: {
          startRow: action.row,
          startCol: action.col,
          endRow: action.row,
          endCol: action.col,
        },
      };

    case 'UPDATE_EDIT_VALUE':
      return { ...state, editing: { ...state.editing, value: action.value } };

    case 'FINISH_EDITING':
    case 'CANCEL_EDITING':
      return { ...state, editing: { cell: null, value: '' } };

    case 'SET_INTERACTION':
      return { ...state, interaction: { ...state.interaction, [action.field]: action.value } };

    case 'SET_UI':
      return { ...state, ui: { ...state.ui, [action.field]: action.value } };

    case 'START_COLUMN_RESIZE':
      return {
        ...state,
        ui: {
          ...state.ui,
          resizing: { column: action.column, startX: action.startX, startWidth: action.startWidth },
        },
      };

    case 'UPDATE_COLUMN_WIDTH':
      return {
        ...state,
        ui: {
          ...state.ui,
          columnWidths: { ...state.ui.columnWidths, [action.column]: action.width },
        },
      };

    case 'FINISH_COLUMN_RESIZE':
      return {
        ...state,
        ui: { ...state.ui, resizing: { column: null, startX: 0, startWidth: 0 } },
      };

    case 'UPDATE_ROW_COST': {
      const newRowCosts = new Map(state.costs.rowCosts);
      newRowCosts.set(action.rowId, action.cost);
      return {
        ...state,
        costs: { ...state.costs, rowCosts: newRowCosts },
      };
    }

    case 'UPDATE_BATCH_TOTAL':
      return {
        ...state,
        costs: { ...state.costs, batchTotal: action.total },
      };

    case 'SET_CALCULATING':
      return {
        ...state,
        costs: { ...state.costs, isCalculating: action.isCalculating },
      };

    case 'SHOW_SUGGESTIONS':
      return {
        ...state,
        ui: {
          ...state.ui,
          suggestions: {
            visible: true,
            items: action.items,
            selectedIndex: 0,
            position: action.position,
          },
        },
      };

    case 'HIDE_SUGGESTIONS':
      return {
        ...state,
        ui: {
          ...state.ui,
          suggestions: { ...state.ui.suggestions, visible: false },
        },
      };

    case 'UPDATE_SUGGESTION_SELECTION':
      return {
        ...state,
        ui: {
          ...state.ui,
          suggestions: { ...state.ui.suggestions, selectedIndex: action.index },
        },
      };

    case 'SHOW_CONTEXT_MENU':
      return {
        ...state,
        ui: {
          ...state.ui,
          contextMenu: {
            visible: true,
            position: action.position,
            selection: action.selection,
          },
        },
      };

    case 'HIDE_CONTEXT_MENU':
      return {
        ...state,
        ui: {
          ...state.ui,
          contextMenu: { ...state.ui.contextMenu, visible: false },
        },
      };

    case 'SET_DRAG_PREVIEW_CELLS':
      return {
        ...state,
        interaction: { ...state.interaction, dragPreviewCells: action.cells },
      };

    case 'SAVE_TO_HISTORY': {
      const newHistory = [
        ...state.history.states.slice(0, state.history.index + 1),
        { rows: action.rows, columns: action.columns },
      ];
      return {
        ...state,
        history: {
          states: newHistory.slice(-50), // Keep last 50 states
          index: Math.min(state.history.index + 1, 49),
        },
      };
    }

    case 'UNDO': {
      if (state.history.index > 0) {
        const idx = state.history.index - 1;
        const historyState = state.history.states[idx];
        return {
          ...state,
          rows: historyState.rows,
          dynamicColumns: historyState.columns,
          history: { ...state.history, index: idx },
        };
      }
      return state;
    }

    case 'REDO': {
      if (state.history.index < state.history.states.length - 1) {
        const idx = state.history.index + 1;
        const historyState = state.history.states[idx];
        return {
          ...state,
          rows: historyState.rows,
          dynamicColumns: historyState.columns,
          history: { ...state.history, index: idx },
        };
      }
      return state;
    }

    case 'RESET_STATE':
      return {
        ...state,
        rows: action.rows,
        dynamicColumns: action.columns,
        history: {
          states: [{ rows: action.rows, columns: action.columns }],
          index: 0,
        },
      };

    default:
      return state;
  }
}

export default function SpreadsheetEditor({
  rows: initialRows,
  onSave,
  onCancel,
  fileName,
  jobResults,
  currentJobId,
}: SpreadsheetEditorProps) {
  // Initialize state with reducer
  const initialState: SpreadsheetState = {
    rows: initialRows?.length ? initialRows : generateInitialRows(8),
    dynamicColumns: [],
    selection: null,
    editing: { cell: null, value: '' },
    interaction: {
      isSelecting: false,
      isDragging: false,
      dragPreview: null,
      dragPreviewCells: [],
      selectionMode: 'cell',
    },
    ui: {
      editingColumnName: null,
      columnWidths: {},
      resizing: { column: null, startX: 0, startWidth: 0 },
      suggestions: {
        visible: false,
        items: [],
        selectedIndex: 0,
        position: { x: 0, y: 0 },
      },
      contextMenu: {
        visible: false,
        position: { x: 0, y: 0 },
        selection: null,
      },
    },
    costs: {
      rowCosts: new Map(),
      batchTotal: { totalUSD: 0, perRow: [] },
      isCalculating: false,
    },
    history: { states: [], index: -1 },
  };

  const [state, dispatch] = useReducer(spreadsheetReducer, initialState);
  const [showTempMenu, setShowTempMenu] = useState(false);
  const { models: allModels } = useProjectStore();

  const tableRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed values from state
  const { rows, dynamicColumns, selection, editing, interaction, ui, costs } = state;
  const allColumns = [...FIXED_INPUT_COLUMNS, ...dynamicColumns, ...OUTPUT_COLUMNS];

  // Update rows when initialRows prop changes (for template/CSV loading)
  useEffect(() => {
    if (initialRows && initialRows.length > 0) {
      // Extract dynamic columns from the new data
      const keys = new Set<string>();
      initialRows.forEach((row) => {
        if (row.data) {
          Object.keys(row.data).forEach((key) => {
            if (!RESERVED_KEYS.includes(key)) keys.add(key);
          });
        }
      });

      const cols: Column[] = Array.from(keys).map((key) => ({
        key,
        label: key,
        width: '150px',
        editable: true,
        isDynamic: true,
      }));

      dispatch({ type: 'RESET_STATE', rows: initialRows, columns: cols });
    }
  }, [initialRows]);

  // Helper functions using dispatch
  const saveToHistory = useCallback((newRows: BatchRow[], newColumns: Column[]) => {
    dispatch({ type: 'SAVE_TO_HISTORY', rows: newRows, columns: newColumns });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  // Cost calculation functions
  const updateBatchCosts = useCallback(async () => {
    dispatch({ type: 'SET_CALCULATING', isCalculating: true });
    try {
      const estimation = await estimateCost(rows, allModels);
      dispatch({ type: 'UPDATE_BATCH_TOTAL', total: estimation });

      // Update individual row costs from the estimation result
      estimation.perRow.forEach((rowCost) => {
        dispatch({
          type: 'UPDATE_ROW_COST',
          rowId: rowCost.id,
          cost: { totalCost: rowCost.est_cost, inputTokens: rowCost.tokens_in },
        });
      });
    } catch (error) {
      console.error('Failed to calculate batch costs:', error);
    } finally {
      dispatch({ type: 'SET_CALCULATING', isCalculating: false });
    }
  }, [rows, allModels]);

  const startEditing = useCallback(
    (row: number, col: number) => {
      if (!allColumns[col]?.editable) return;
      const value = getCellValue(rows[row], allColumns[col].key);
      dispatch({ type: 'START_EDITING', row, col, value });

      // Focus management
      setTimeout(() => {
        const colKey = allColumns[col].key;
        if (['prompt', 'system', 'jsonSchema'].includes(colKey) || allColumns[col].isDynamic) {
          textareaRef.current?.focus();
        } else if (colKey === 'model') {
          if (selectRef.current) {
            selectRef.current.focus();
            setTimeout(() => selectRef.current?.click(), 0);
          }
        } else {
          inputRef.current?.focus();
        }
      }, 0);
    },
    [allColumns, rows]
  );

  const finishEditing = useCallback(() => {
    if (!editing.cell) return;
    const { row, col } = editing.cell;
    const newRows = [...rows];
    const updatedRow = setCellValueInRow(rows[row], allColumns[col].key, editing.value, allColumns);
    newRows[row] = updatedRow;

    dispatch({ type: 'SET_ROWS', rows: newRows });
    dispatch({ type: 'FINISH_EDITING' });
    saveToHistory(newRows, dynamicColumns);

    // Update cost calculation for the entire batch when a relevant cell changes
    const costRelevantFields = ['prompt', 'system', 'model', 'jsonSchema'];
    if (costRelevantFields.includes(allColumns[col].key) || allColumns[col].isDynamic) {
      updateBatchCosts();
    }
  }, [editing, rows, allColumns, dynamicColumns, saveToHistory, updateBatchCosts]);

  const handleCellMouseDown = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      e.preventDefault();

      if (!allColumns[col]?.editable) return;

      // Set initial selection
      const newSelection =
        e.shiftKey && selection
          ? { ...selection, endRow: row, endCol: col }
          : { startRow: row, startCol: col, endRow: row, endCol: col };

      dispatch({ type: 'SET_SELECTION', selection: newSelection });
      dispatch({ type: 'SET_INTERACTION', field: 'selectionMode', value: 'cell' });

      // Only start selecting mode on mouse down - will be enabled if mouse moves
      dispatch({ type: 'SET_INTERACTION', field: 'isSelecting', value: false });
    },
    [selection, allColumns]
  );

  const handleCellMouseMove = useCallback(
    (row: number, col: number, _e: React.MouseEvent) => {
      // Only extend selection if we're actively selecting (mouse is down and moved)
      if (!interaction.isSelecting || !selection) return;

      dispatch({
        type: 'SET_SELECTION',
        selection: { ...selection, endRow: row, endCol: col },
      });
    },
    [interaction.isSelecting, selection]
  );

  const handleCellDoubleClick = useCallback(
    (row: number, col: number) => {
      if (!allColumns[col]?.editable) return;
      startEditing(row, col);
      dispatch({ type: 'SET_INTERACTION', field: 'isSelecting', value: false });
    },
    [allColumns, startEditing]
  );

  const _handleSave = useCallback(() => {
    onSave(normalizeRows(rows, dynamicColumns));
    const msg = document.createElement('div');
    msg.textContent = 'Saved!';
    msg.className =
      'fixed bottom-4 right-4 bg-[var(--accent-success)] text-[var(--accent-success-foreground)] px-4 py-2 rounded shadow-lg z-50';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2000);
  }, [rows, dynamicColumns, onSave]);

  const handleExportCSV = useCallback(() => {
    exportToCSV(rows, allColumns, dynamicColumns, fileName);
  }, [rows, allColumns, dynamicColumns, fileName]);

  const handleAddColumn = useCallback(() => {
    const key = `column_${Date.now()}`;
    const newCol: Column = {
      key,
      label: 'New Column',
      width: '150px',
      editable: true,
      isDynamic: true,
    };
    const newCols = [...dynamicColumns, newCol];
    const newRows = rows.map((row) => ({ ...row, data: { ...row.data, [key]: '' } }));

    dispatch({ type: 'SET_DYNAMIC_COLUMNS', columns: newCols });
    dispatch({ type: 'SET_ROWS', rows: newRows });
    saveToHistory(newRows, newCols);

    setTimeout(
      () =>
        dispatch({
          type: 'SET_UI',
          field: 'editingColumnName',
          value: FIXED_INPUT_COLUMNS.length + dynamicColumns.length,
        }),
      0
    );
  }, [dynamicColumns, rows, saveToHistory]);

  const handleDeleteColumn = useCallback(
    (colKey: string) => {
      const column = dynamicColumns.find((col) => col.key === colKey);
      if (!column) return;

      const newColumns = dynamicColumns.filter((col) => col.key !== colKey);

      // Remove data from all rows
      const newRows = rows.map((row) => {
        if (row.data && row.data[colKey] !== undefined) {
          const { [colKey]: _, ...restData } = row.data;
          return { ...row, data: restData };
        }
        return row;
      });

      dispatch({ type: 'SET_DYNAMIC_COLUMNS', columns: newColumns });
      dispatch({ type: 'SET_ROWS', rows: newRows });
      saveToHistory(newRows, newColumns);
    },
    [dynamicColumns, rows, saveToHistory]
  );

  // Smart CSV import handler
  const handleCsvImport = useCallback(async (file: File) => {
    try {
      const { rows: csvRows, errors } = await parseSmartCSV(file);

      if (errors.length > 0) {
        // Show import errors to user
        const errorMessage = errors
          .slice(0, 3)
          .map((e) => `Row ${e.row}: ${e.message}`)
          .join('\n');
        alert(
          `Import completed with ${errors.length} error(s):\n${errorMessage}${errors.length > 3 ? '\n...' : ''}`
        );
      }

      if (csvRows.length > 0) {
        // Extract dynamic columns from imported data
        const keys = new Set<string>();
        csvRows.forEach((row) => {
          if (row.data) {
            Object.keys(row.data).forEach((key) => {
              if (!RESERVED_KEYS.includes(key)) keys.add(key);
            });
          }
        });

        const cols: Column[] = Array.from(keys).map((key) => ({
          key,
          label: key,
          width: '150px',
          editable: true,
          isDynamic: true,
        }));

        dispatch({ type: 'RESET_STATE', rows: csvRows, columns: cols });

        // Show import success
        const msg = document.createElement('div');
        msg.textContent = 'CSV imported successfully!';
        msg.className =
          'fixed bottom-4 right-4 bg-[var(--accent-success)] text-[var(--accent-success-foreground)] px-4 py-2 rounded shadow-lg z-50';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
      }
    } catch (error) {
      console.error('CSV import failed:', error);
      alert('Failed to import CSV file. Please check the file format and try again.');
    }
  }, []);

  // Advanced operation handlers
  const handleFillDown = useCallback(() => {
    if (!selection) return;
    const newRows = fillDown(rows, selection, allColumns);
    dispatch({ type: 'SET_ROWS', rows: newRows });
    saveToHistory(newRows, dynamicColumns);
  }, [selection, rows, allColumns, dynamicColumns, saveToHistory]);

  const handleSelectAll = useCallback(() => {
    if (rows.length === 0 || allColumns.length === 0) return;
    dispatch({
      type: 'SET_SELECTION',
      selection: {
        startRow: 0,
        startCol: 0,
        endRow: rows.length - 1,
        endCol: allColumns.length - 1,
      },
    });
  }, [rows.length, allColumns.length]);

  const handleFindReplace = useCallback(() => {
    const findText = prompt('Find:');
    if (!findText) return;

    const replaceText = prompt('Replace with:');
    if (replaceText === null) return;

    const { rows: newRows, matchCount } = findAndReplace(rows, findText, replaceText);

    if (matchCount > 0) {
      dispatch({ type: 'SET_ROWS', rows: newRows });
      saveToHistory(newRows, dynamicColumns);
      alert(`Replaced ${matchCount} occurrence(s)`);
    } else {
      alert('No matches found');
    }
  }, [rows, dynamicColumns, saveToHistory]);

  // Batch operations for temperature
  const handleBatchTemperature = useCallback(
    (temperature: number) => {
      const newRows = bulkChangeTemperature(rows, temperature);
      dispatch({ type: 'SET_ROWS', rows: newRows });
      saveToHistory(newRows, dynamicColumns);
    },
    [rows, dynamicColumns, saveToHistory]
  );

  // Calculate drag preview cells for visual feedback
  const calculateDragPreviewCells = useCallback(
    (selection: CellSelection, dragPreview: DragPreview): Array<{ row: number; col: number }> => {
      const cells: Array<{ row: number; col: number }> = [];
      const { startRow, endRow, startCol, endCol } = selection;
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);

      // Calculate the fill area based on drag direction
      const fillStartRow =
        dragPreview.row > maxRow ? maxRow + 1 : Math.min(minRow, dragPreview.row);
      const fillEndRow =
        dragPreview.row > maxRow ? dragPreview.row : Math.max(maxRow, dragPreview.row);
      const fillStartCol =
        dragPreview.col > maxCol ? maxCol + 1 : Math.min(minCol, dragPreview.col);
      const fillEndCol =
        dragPreview.col > maxCol ? dragPreview.col : Math.max(maxCol, dragPreview.col);

      // Add cells in the fill area to preview
      for (let row = fillStartRow; row <= fillEndRow; row++) {
        for (let col = fillStartCol; col <= fillEndCol; col++) {
          // Don't include cells that are already selected
          if (row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) continue;
          cells.push({ row, col });
        }
      }

      return cells;
    },
    []
  );

  // Auto-suggestion handler
  const handleSuggestionTrigger = useCallback(
    (value: string, cellElement: HTMLElement) => {
      const colKey = allColumns[editing.cell?.col || 0]?.key;
      let suggestions: string[] = [];

      if (colKey === 'prompt' && value.length > 2) {
        suggestions = getPromptSuggestions(value);
      } else if (colKey === 'model' && value.length > 1) {
        suggestions = getModelSuggestions(value);
      }

      if (suggestions.length > 0) {
        const rect = cellElement.getBoundingClientRect();
        dispatch({
          type: 'SHOW_SUGGESTIONS',
          items: suggestions,
          position: { x: rect.left, y: rect.bottom },
        });
      } else {
        dispatch({ type: 'HIDE_SUGGESTIONS' });
      }
    },
    [allColumns, editing.cell]
  );

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Only close if clicking outside the menu or its trigger button
      if (showTempMenu && !target.closest('.relative')) {
        setShowTempMenu(false);
      }
      // Close suggestions dropdown
      if (ui.suggestions.visible && !target.closest('.suggestions-dropdown')) {
        dispatch({ type: 'HIDE_SUGGESTIONS' });
      }
      // Close context menu
      if (ui.contextMenu.visible) {
        dispatch({ type: 'HIDE_CONTEXT_MENU' });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTempMenu, ui.suggestions.visible, ui.contextMenu.visible]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard events when the component is focused or no input is focused
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true');

      // Don't interfere with navigation or other app functionality when not in spreadsheet
      if (isInputFocused && !activeElement.closest('.spreadsheet-editor')) {
        return;
      }

      if (editing.cell && e.key === 'Tab') {
        e.preventDefault();
        finishEditing();
        const next = getNextEditableCell(
          editing.cell.row,
          editing.cell.col,
          allColumns,
          rows.length,
          e.shiftKey ? 'backward' : 'forward'
        );
        if (next) {
          dispatch({
            type: 'SET_SELECTION',
            selection: {
              startRow: next.row,
              startCol: next.col,
              endRow: next.row,
              endCol: next.col,
            },
          });
          startEditing(next.row, next.col);
        }
        return;
      }

      if (editing.cell) return;

      const handlers: Record<string, () => void> = {
        z: () => (e.ctrlKey || e.metaKey) && !e.shiftKey && (e.preventDefault(), undo()),
        y: () => (e.ctrlKey || e.metaKey) && (e.preventDefault(), redo()),
        Z: () => (e.ctrlKey || e.metaKey) && e.shiftKey && (e.preventDefault(), redo()),
        c: () =>
          (e.ctrlKey || e.metaKey) &&
          selection &&
          copySelection(rows, selection, allColumns, interaction.selectionMode),
        v: () =>
          (e.ctrlKey || e.metaKey) &&
          selection &&
          pasteClipboard(rows, selection, allColumns).then((r) => {
            dispatch({ type: 'SET_ROWS', rows: r });
            saveToHistory(r, dynamicColumns);
          }),
        x: () =>
          (e.ctrlKey || e.metaKey) &&
          selection &&
          (copySelection(rows, selection, allColumns, interaction.selectionMode),
          dispatch({ type: 'SET_ROWS', rows: deleteSelection(rows, selection, allColumns) })),
        Delete: () =>
          selection &&
          (dispatch({ type: 'SET_ROWS', rows: deleteSelection(rows, selection, allColumns) }),
          saveToHistory(rows, dynamicColumns)),
        Backspace: () =>
          selection &&
          (dispatch({ type: 'SET_ROWS', rows: deleteSelection(rows, selection, allColumns) }),
          saveToHistory(rows, dynamicColumns)),
        Enter: () => selection && startEditing(selection.startRow, selection.startCol),
        Tab: () => {
          if (!selection) return;
          e.preventDefault();
          const next = getNextEditableCell(
            selection.startRow,
            selection.startCol,
            allColumns,
            rows.length,
            e.shiftKey ? 'backward' : 'forward'
          );
          if (next)
            dispatch({
              type: 'SET_SELECTION',
              selection: {
                startRow: next.row,
                startCol: next.col,
                endRow: next.row,
                endCol: next.col,
              },
            });
        },
        // Advanced shortcuts
        d: () => (e.ctrlKey || e.metaKey) && selection && (e.preventDefault(), handleFillDown()),
        f: () => (e.ctrlKey || e.metaKey) && (e.preventDefault(), handleFindReplace()),
        h: () => (e.ctrlKey || e.metaKey) && (e.preventDefault(), handleFindReplace()),
        a: () => (e.ctrlKey || e.metaKey) && (e.preventDefault(), handleSelectAll()),
      };

      // Only handle spreadsheet shortcuts when focused on spreadsheet
      if (activeElement?.closest('.spreadsheet-editor') && e.key in handlers) {
        handlers[e.key]();
      } else if (
        activeElement?.closest('.spreadsheet-editor') &&
        selection &&
        interaction.selectionMode === 'cell' &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        e.preventDefault();
        const { startRow, startCol } = selection;
        const moves = {
          ArrowUp: { row: Math.max(0, startRow - 1), col: startCol },
          ArrowDown: { row: Math.min(rows.length - 1, startRow + 1), col: startCol },
          ArrowLeft: { row: startRow, col: Math.max(0, startCol - 1) },
          ArrowRight: { row: startRow, col: Math.min(allColumns.length - 1, startCol + 1) },
        };
        const move = moves[e.key as keyof typeof moves];
        dispatch({
          type: 'SET_SELECTION',
          selection: { startRow: move.row, startCol: move.col, endRow: move.row, endCol: move.col },
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selection,
    editing,
    rows,
    allColumns,
    interaction.selectionMode,
    dynamicColumns,
    startEditing,
    finishEditing,
    saveToHistory,
    undo,
    redo,
  ]);

  // Mouse handlers
  useEffect(() => {
    let mouseDownPos: { x: number; y: number } | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      // If mouse moved significantly from initial position, enable selecting mode
      if (mouseDownPos && !interaction.isSelecting) {
        const distance = Math.sqrt(
          Math.pow(e.clientX - mouseDownPos.x, 2) + Math.pow(e.clientY - mouseDownPos.y, 2)
        );
        if (distance > 5) {
          // 5px threshold for drag detection
          dispatch({ type: 'SET_INTERACTION', field: 'isSelecting', value: true });
        }
      }

      // Update drag preview cells for visual feedback during drag operations
      if (interaction.isDragging && selection && interaction.dragPreview) {
        const previewCells = calculateDragPreviewCells(selection, interaction.dragPreview);
        dispatch({ type: 'SET_DRAG_PREVIEW_CELLS', cells: previewCells });
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      mouseDownPos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      mouseDownPos = null;
      dispatch({ type: 'SET_INTERACTION', field: 'isSelecting', value: false });

      if (interaction.isDragging && interaction.dragPreview && selection) {
        const newRows = performDragFill(rows, selection, interaction.dragPreview, allColumns);
        dispatch({ type: 'SET_ROWS', rows: newRows });
        saveToHistory(newRows, dynamicColumns);
      }

      // Clear all drag-related state
      dispatch({ type: 'SET_INTERACTION', field: 'isDragging', value: false });
      dispatch({ type: 'SET_INTERACTION', field: 'dragPreview', value: null });
      dispatch({ type: 'SET_DRAG_PREVIEW_CELLS', cells: [] });
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    interaction.isDragging,
    interaction.dragPreview,
    interaction.isSelecting,
    selection,
    rows,
    allColumns,
    dynamicColumns,
    saveToHistory,
  ]);

  // Column resize handler
  useEffect(() => {
    if (ui.resizing.column === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (ui.resizing.column === null) return;
      const width = `${Math.max(50, ui.resizing.startWidth + e.clientX - ui.resizing.startX)}px`;
      const colKey = allColumns[ui.resizing.column].key;
      dispatch({ type: 'UPDATE_COLUMN_WIDTH', column: colKey, width });

      if (allColumns[ui.resizing.column].isDynamic) {
        const newCols = dynamicColumns.map((col) => (col.key === colKey ? { ...col, width } : col));
        dispatch({ type: 'SET_DYNAMIC_COLUMNS', columns: newCols });
      }
    };

    const handleMouseUp = () => {
      const resizingColumn = ui.resizing.column;
      dispatch({ type: 'FINISH_COLUMN_RESIZE' });
      if (resizingColumn !== null && allColumns[resizingColumn]?.isDynamic)
        saveToHistory(rows, dynamicColumns);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [ui.resizing, allColumns, rows, dynamicColumns, saveToHistory]);

  // Real-time results update
  useEffect(() => {
    if (!currentJobId || !jobResults) return;

    const updatedRows = rows.map((row) => {
      const result = jobResults.get(row.id);
      if (!result) return row;

      const statusMap: Record<string, string> = {
        success: 'completed',
        error: 'failed',
        'error-api': 'failed',
        'error-missing-key': 'failed',
        failed: 'failed',
        processing: 'processing',
      };

      return {
        ...row,
        status: statusMap[result.status] || 'pending',
        response: result.response || '',
        cost_usd: result.cost_usd || 0,
        latency_ms: result.latency_ms || 0,
        error: result.error || '',
      };
    });

    dispatch({ type: 'SET_ROWS', rows: updatedRows });
  }, [currentJobId, jobResults]);

  // Effect to calculate costs when rows change significantly
  useEffect(() => {
    // Debounce cost calculations to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      updateBatchCosts();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [rows.length, updateBatchCosts]);

  const renderCell = (row: ExtendedBatchRow, col: Column, rowIdx: number, colIdx: number) => {
    const isEditing = editing.cell?.row === rowIdx && editing.cell?.col === colIdx;
    const value = getCellValue(row, col.key);

    if (isEditing) {
      if (col.key === 'model') {
        return (
          <select
            ref={selectRef}
            value={editing.value}
            onChange={(e) => {
              dispatch({ type: 'UPDATE_EDIT_VALUE', value: e.target.value });
              // Finish editing immediately after selection
              setTimeout(finishEditing, 0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Tab') {
                finishEditing();
              }
              if (e.key === 'Escape') {
                dispatch({ type: 'CANCEL_EDITING' });
              }
            }}
            className="w-full px-1 py-0.5 border rounded outline-none bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border)]"
            autoFocus
          >
            <option value="">Default</option>
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        );
      }

      if (['prompt', 'system', 'jsonSchema'].includes(col.key) || col.isDynamic) {
        return (
          <textarea
            ref={textareaRef}
            value={editing.value}
            onChange={(e) => {
              dispatch({ type: 'UPDATE_EDIT_VALUE', value: e.target.value });
              if (col.key === 'prompt') handleSuggestionTrigger(e.target.value, e.target);
            }}
            onBlur={finishEditing}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === 'Return') && !e.shiftKey) {
                e.preventDefault();
                finishEditing();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                dispatch({ type: 'CANCEL_EDITING' });
              }
              // Handle suggestions navigation
              if (ui.suggestions.visible) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  dispatch({
                    type: 'UPDATE_SUGGESTION_SELECTION',
                    index: Math.min(
                      ui.suggestions.selectedIndex + 1,
                      ui.suggestions.items.length - 1
                    ),
                  });
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  dispatch({
                    type: 'UPDATE_SUGGESTION_SELECTION',
                    index: Math.max(ui.suggestions.selectedIndex - 1, 0),
                  });
                } else if (e.key === 'Tab' || e.key === 'Enter') {
                  e.preventDefault();
                  dispatch({
                    type: 'UPDATE_EDIT_VALUE',
                    value: ui.suggestions.items[ui.suggestions.selectedIndex],
                  });
                  dispatch({ type: 'HIDE_SUGGESTIONS' });
                }
              }
            }}
            className="w-full min-h-[24px] px-1 py-0.5 border rounded outline-none resize-none bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border)]"
          />
        );
      }

      return (
        <input
          ref={inputRef}
          type={col.key === 'temperature' ? 'number' : 'text'}
          value={editing.value}
          onChange={(e) => {
            dispatch({ type: 'UPDATE_EDIT_VALUE', value: e.target.value });
            if (col.key === 'model') handleSuggestionTrigger(e.target.value, e.target);
          }}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              finishEditing();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              dispatch({ type: 'CANCEL_EDITING' });
            }
            if (col.key === 'temperature' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
              e.preventDefault();
              const v = parseFloat(editing.value || '0');
              dispatch({
                type: 'UPDATE_EDIT_VALUE',
                value: (e.key === 'ArrowUp' ? Math.min(2, v + 0.1) : Math.max(0, v - 0.1)).toFixed(
                  1
                ),
              });
            }
          }}
          step={col.key === 'temperature' ? '0.1' : undefined}
          min={col.key === 'temperature' ? '0' : undefined}
          max={col.key === 'temperature' ? '2' : undefined}
          className="w-full px-1 py-0.5 border rounded outline-none bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border)]"
          autoFocus
        />
      );
    }

    if (col.key === 'status') {
      const cls = {
        pending: 'text-gray-500',
        processing: 'text-blue-500',
        completed: 'text-green-500',
        failed: 'text-red-500',
      };
      return (
        <span className={cls[value as keyof typeof cls] || 'text-gray-500'}>
          {value || 'pending'}
        </span>
      );
    }

    if (col.key === 'model') {
      const model = MODELS.find((m) => m.value === value);
      return (
        <span className="cursor-pointer" title="Click to edit">
          {model?.label || value || 'Default'}
        </span>
      );
    }

    if (col.key === 'cost_usd') {
      const rowCost = costs.rowCosts.get(row.id);
      if (rowCost) {
        return (
          <span className="flex flex-col text-xs">
            <span className="font-medium">{formatCost(rowCost.totalCost)}</span>
            <span className="text-gray-500">{formatTokens(rowCost.inputTokens)}t in</span>
          </span>
        );
      }
      return <span className="text-gray-400">Calculating...</span>;
    }

    // Add token count preview for prompt/system fields
    if (['prompt', 'system'].includes(col.key) && value) {
      const rowCost = costs.rowCosts.get(row.id);
      return (
        <span className="truncate group relative" title={value}>
          {value}
          {rowCost && (
            <span className="absolute top-0 right-0 bg-blue-100 text-blue-800 text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              {formatTokens(rowCost.inputTokens)}t
            </span>
          )}
        </span>
      );
    }

    return (
      <span className="truncate" title={value}>
        {value}
      </span>
    );
  };

  const renderTotalCost = () => {
    if (costs.isCalculating) {
      return 'Calculating...';
    }
    return <span className="font-medium">{formatCost(costs.batchTotal.totalUSD)}</span>;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {fileName ? `Editing: ${fileName}` : 'Batch Spreadsheet Editor'}
          </h2>
          <div className="flex items-center gap-4 mt-1 text-sm text-[var(--text-secondary)]">
            <span>{rows.length} rows</span>
            <span>•</span>
            <span>Est. Cost: {renderTotalCost()}</span>
            <span>•</span>
            <span>
              Input Tokens:{' '}
              {formatTokens(costs.batchTotal.perRow.reduce((sum, r) => sum + r.tokens_in, 0))}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCsvImport(file);
              e.target.value = ''; // Reset for re-import
            }}
            className="hidden"
          />

          {/* Import/Export Group */}
          <div className="flex gap-1 border-r border-[var(--border)] pr-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded hover:bg-[var(--bg-secondary)]"
              title="Import CSV file with smart column detection"
            >
              📥 Import CSV
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1 text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded hover:bg-[var(--bg-secondary)]"
              title="Export spreadsheet as CSV"
            >
              📤 Export CSV
            </button>
          </div>

          {/* Add Content Group */}
          <div className="flex gap-1 border-r border-[var(--border)] pr-3">
            <button
              onClick={() => {
                const newRows = [...rows, createEmptyRow(`row-${rows.length + 1}`)];
                dispatch({ type: 'SET_ROWS', rows: newRows });
                saveToHistory(newRows, dynamicColumns);
              }}
              className="px-3 py-1 text-sm bg-[var(--accent-success)] text-[var(--accent-success-foreground)] rounded hover:bg-opacity-90"
              title="Add a new row"
            >
              + Row
            </button>
            <button
              onClick={handleAddColumn}
              className="px-3 py-1 text-sm bg-[var(--accent-primary)] text-[var(--accent-primary-foreground)] rounded hover:bg-opacity-90"
              title="Add a new column"
            >
              + Column
            </button>
          </div>

          {/* Actions Group */}
          <div className="flex gap-1">
            <button
              onClick={onCancel}
              className="px-4 py-1 text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded hover:bg-[var(--bg-secondary)]"
              title="Clear spreadsheet and reset to defaults"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div
        ref={tableRef}
        className={`flex-1 overflow-auto relative spreadsheet-editor ${interaction.isSelecting ? 'selecting' : ''} ${interaction.isDragging ? 'dragging' : ''}`}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                className="border border-[var(--border)] px-2 py-1 bg-[var(--bg-tertiary)] sticky left-0 z-10 text-[var(--text-primary)]"
                style={{ width: '50px', minWidth: '50px', maxWidth: '50px' }}
              >
                #
              </th>
              {allColumns.map((col, idx) => (
                <th
                  key={`${col.key}-${idx}`}
                  className="border border-[var(--border)] px-2 py-1 bg-[var(--bg-tertiary)] relative text-[var(--text-primary)]"
                  style={{ width: ui.columnWidths[col.key] || col.width }}
                >
                  <div className="flex items-center justify-between">
                    {ui.editingColumnName === idx ? (
                      <input
                        type="text"
                        defaultValue={col.label}
                        autoFocus
                        onBlur={(e) => {
                          const newLabel = e.target.value.trim();
                          if (newLabel && col.isDynamic) {
                            const newCols = dynamicColumns.map((c) =>
                              c.key === col.key ? { ...c, label: newLabel } : c
                            );
                            dispatch({ type: 'SET_DYNAMIC_COLUMNS', columns: newCols });
                            saveToHistory(rows, newCols);
                          }
                          dispatch({ type: 'SET_UI', field: 'editingColumnName', value: null });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                          if (e.key === 'Escape') {
                            dispatch({ type: 'SET_UI', field: 'editingColumnName', value: null });
                          }
                        }}
                        className="bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] rounded px-1 text-sm"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        {/* Column type indicator */}
                        {col.isDynamic ? (
                          <span
                            className="text-xs px-1 py-0.5 bg-blue-100 text-blue-800 rounded"
                            title="Dynamic column - can be used as {{variable}} in prompts"
                          >
                            VAR
                          </span>
                        ) : OUTPUT_COLUMNS.some((c) => c.key === col.key) ? (
                          <span
                            className="text-xs px-1 py-0.5 bg-green-100 text-green-800 rounded"
                            title="Output column - populated by batch results"
                          >
                            OUT
                          </span>
                        ) : (
                          <span
                            className="text-xs px-1 py-0.5 bg-gray-100 text-gray-800 rounded"
                            title="Input column - configures batch behavior"
                          >
                            IN
                          </span>
                        )}
                        <span
                          onDoubleClick={() =>
                            col.isDynamic &&
                            dispatch({ type: 'SET_UI', field: 'editingColumnName', value: idx })
                          }
                          className={col.isDynamic ? 'cursor-pointer' : ''}
                          title={col.isDynamic ? 'Double-click to rename' : ''}
                        >
                          {col.label}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {col.key === 'temperature' && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTempMenu(!showTempMenu);
                            }}
                            className="text-xs px-1 py-0.5 bg-[var(--accent-primary)] text-[var(--accent-primary-foreground)] rounded hover:bg-opacity-80"
                            title="Batch set temperature"
                          >
                            ⚙
                          </button>
                          {showTempMenu && (
                            <div
                              className="absolute top-full left-0 mt-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded shadow-lg z-50 min-w-32"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="py-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBatchTemperature(0);
                                    setShowTempMenu(false);
                                  }}
                                  className="block w-full px-3 py-1 text-left hover:bg-[var(--bg-secondary)] text-sm"
                                >
                                  0 (Deterministic)
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBatchTemperature(0.3);
                                    setShowTempMenu(false);
                                  }}
                                  className="block w-full px-3 py-1 text-left hover:bg-[var(--bg-secondary)] text-sm"
                                >
                                  0.3 (Focused)
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBatchTemperature(0.7);
                                    setShowTempMenu(false);
                                  }}
                                  className="block w-full px-3 py-1 text-left hover:bg-[var(--bg-secondary)] text-sm"
                                >
                                  0.7 (Balanced)
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBatchTemperature(1.0);
                                    setShowTempMenu(false);
                                  }}
                                  className="block w-full px-3 py-1 text-left hover:bg-[var(--bg-secondary)] text-sm"
                                >
                                  1.0 (Creative)
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBatchTemperature(1.5);
                                    setShowTempMenu(false);
                                  }}
                                  className="block w-full px-3 py-1 text-left hover:bg-[var(--bg-secondary)] text-sm"
                                >
                                  1.5 (Very Creative)
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {col.isDynamic && (
                        <button
                          onClick={() => handleDeleteColumn(col.key)}
                          className="ml-1 text-[var(--accent-danger)] hover:bg-[var(--accent-danger)] hover:text-white rounded px-1"
                          title="Delete column"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className="column-resize-handle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      dispatch({
                        type: 'START_COLUMN_RESIZE',
                        column: idx,
                        startX: e.clientX,
                        startWidth: parseInt(ui.columnWidths[col.key] || col.width),
                      });
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.id}>
                <td
                  className="border border-[var(--border)] px-2 py-1 bg-[var(--bg-tertiary)] text-center sticky left-0 z-10 text-[var(--text-primary)]"
                  style={{ width: '50px', minWidth: '50px', maxWidth: '50px' }}
                >
                  {rowIdx + 1}
                </td>
                {allColumns.map((col, colIdx) => {
                  const isSelected =
                    selection &&
                    rowIdx >= Math.min(selection.startRow, selection.endRow) &&
                    rowIdx <= Math.max(selection.startRow, selection.endRow) &&
                    colIdx >= Math.min(selection.startCol, selection.endCol) &&
                    colIdx <= Math.max(selection.startCol, selection.endCol);
                  const isDragHandle =
                    selection && rowIdx === selection.endRow && colIdx === selection.endCol;
                  const isDragPreview = interaction.dragPreviewCells.some(
                    (cell) => cell.row === rowIdx && cell.col === colIdx
                  );

                  return (
                    <td
                      key={`${col.key}-${colIdx}-${rowIdx}`}
                      data-testid={`cell-${rowIdx}-${colIdx}`}
                      className={`border border-[var(--border)] px-2 py-1 relative spreadsheet-cell ${isSelected ? 'selected' : ''} ${isDragPreview ? 'drag-preview' : ''} ${col.editable ? 'cursor-text' : 'cursor-default'} text-[var(--text-primary)]`}
                      style={{ width: ui.columnWidths[col.key] || col.width }}
                      onMouseDown={(e) => col.editable && handleCellMouseDown(rowIdx, colIdx, e)}
                      onMouseEnter={(e) => {
                        if (interaction.isSelecting && selection)
                          handleCellMouseMove(rowIdx, colIdx, e);
                        if (interaction.isDragging) {
                          dispatch({
                            type: 'SET_INTERACTION',
                            field: 'dragPreview',
                            value: { row: rowIdx, col: colIdx },
                          });
                        }
                      }}
                      onDoubleClick={() => col.editable && handleCellDoubleClick(rowIdx, colIdx)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (selection) {
                          dispatch({
                            type: 'SHOW_CONTEXT_MENU',
                            position: { x: e.clientX, y: e.clientY },
                            selection,
                          });
                        }
                      }}
                      title="Double-click to edit"
                    >
                      {renderCell(row, col, rowIdx, colIdx)}
                      {isDragHandle && col.editable && (
                        <div
                          className="drag-handle group"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            dispatch({ type: 'SET_INTERACTION', field: 'isDragging', value: true });
                          }}
                          title="Drag to fill cells"
                        >
                          <div className="drag-handle-icon">⊞</div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Suggestions Dropdown */}
      {ui.suggestions.visible && (
        <div
          className="fixed bg-[var(--bg-primary)] border border-[var(--border)] rounded shadow-lg z-50 max-w-xs suggestions-dropdown"
          style={{
            left: ui.suggestions.position.x,
            top: ui.suggestions.position.y,
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {ui.suggestions.items.map((item, index) => (
            <div
              key={index}
              className={`px-3 py-2 text-sm cursor-pointer ${
                index === ui.suggestions.selectedIndex
                  ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-foreground)]'
                  : 'hover:bg-[var(--bg-secondary)]'
              }`}
              onClick={() => {
                if (editing.cell) {
                  dispatch({ type: 'UPDATE_EDIT_VALUE', value: item });
                }
                dispatch({ type: 'HIDE_SUGGESTIONS' });
              }}
            >
              {item}
            </div>
          ))}
        </div>
      )}

      {/* Context Menu */}
      {ui.contextMenu.visible && (
        <div
          className="fixed bg-[var(--bg-primary)] border border-[var(--border)] rounded shadow-lg z-50 min-w-48"
          style={{
            left: ui.contextMenu.position.x,
            top: ui.contextMenu.position.y,
          }}
        >
          <div className="py-1">
            <button
              onClick={() => {
                if (selection) {
                  copySelection(rows, selection, allColumns, interaction.selectionMode);
                }
                dispatch({ type: 'HIDE_CONTEXT_MENU' });
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-secondary)]"
            >
              Copy
            </button>
            <button
              onClick={() => {
                if (selection) {
                  pasteClipboard(rows, selection, allColumns).then((newRows) => {
                    dispatch({ type: 'SET_ROWS', rows: newRows });
                    saveToHistory(newRows, dynamicColumns);
                  });
                }
                dispatch({ type: 'HIDE_CONTEXT_MENU' });
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-secondary)]"
            >
              Paste
            </button>
            <hr className="my-1 border-[var(--border)]" />
            <button
              onClick={() => {
                if (selection) {
                  handleFillDown();
                }
                dispatch({ type: 'HIDE_CONTEXT_MENU' });
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-secondary)]"
            >
              Fill Down
            </button>
            <button
              onClick={() => {
                handleFindReplace();
                dispatch({ type: 'HIDE_CONTEXT_MENU' });
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-secondary)]"
            >
              Find & Replace
            </button>
            <hr className="my-1 border-[var(--border)]" />
            <button
              onClick={() => {
                if (selection) {
                  const newRows = deleteSelection(rows, selection, allColumns);
                  dispatch({ type: 'SET_ROWS', rows: newRows });
                  saveToHistory(newRows, dynamicColumns);
                }
                dispatch({ type: 'HIDE_CONTEXT_MENU' });
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-secondary)] text-[var(--accent-danger)]"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
