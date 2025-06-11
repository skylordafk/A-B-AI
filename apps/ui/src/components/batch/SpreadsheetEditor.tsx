import { useState, useEffect, useRef } from 'react';
import type { BatchRow } from '../../types/batch';
import Papa from 'papaparse';
import '../../styles/spreadsheet.css';

interface SpreadsheetEditorProps {
  rows: BatchRow[];
  onSave: (rows: BatchRow[]) => void;
  onCancel: () => void;
  fileName?: string;
}

interface CellSelection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

const COLUMNS = [
  { key: 'prompt', label: 'Prompt', width: '40%' },
  { key: 'system', label: 'System Message', width: '25%' },
  { key: 'model', label: 'Model', width: '20%' },
  { key: 'temperature', label: 'Temperature', width: '15%' },
] as const;

const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  { value: 'o1-preview', label: 'o1-preview' },
  { value: 'o1-mini', label: 'o1-mini' },
];

export default function SpreadsheetEditor({
  rows: initialRows,
  onSave,
  onCancel,
  fileName,
}: SpreadsheetEditorProps) {
  const [rows, setRows] = useState<BatchRow[]>(initialRows);
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ row: number; col: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingCell) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        handlePaste();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        handleCut();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        setSelection(null);
      } else if (
        selection &&
        (e.key === 'ArrowUp' ||
          e.key === 'ArrowDown' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight')
      ) {
        e.preventDefault();
        handleArrowNavigation(e.key);
      } else if (e.key === 'Enter' && selection) {
        const { startRow, startCol } = selection;
        startEditing(startRow, startCol);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, editingCell, rows]);

  const getCellValue = (row: BatchRow, colKey: string): string => {
    const value = row[colKey as keyof BatchRow];
    return value?.toString() || '';
  };

  const setCellValue = (rowIndex: number, colKey: string, value: string) => {
    const newRows = [...rows];
    const row = { ...newRows[rowIndex] };

    switch (colKey) {
      case 'temperature': {
        const temp = parseFloat(value);
        row.temperature = isNaN(temp) ? undefined : temp;
        break;
      }
      case 'prompt':
        row.prompt = value || '';
        break;
      case 'system':
        row.system = value || undefined;
        break;
      case 'model':
        row.model = value || undefined;
        break;
    }

    newRows[rowIndex] = row;
    setRows(newRows);
  };

  const startEditing = (row: number, col: number) => {
    setEditingCell({ row, col });
    const colKey = COLUMNS[col].key;
    setEditValue(getCellValue(rows[row], colKey));

    // Focus input after state update
    setTimeout(() => {
      if (colKey === 'prompt' || colKey === 'system') {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      } else if (colKey === 'model') {
        selectRef.current?.focus();
      } else {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, 0);
  };

  const finishEditing = () => {
    if (editingCell) {
      const { row, col } = editingCell;
      setCellValue(row, COLUMNS[col].key, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (e.shiftKey && selection) {
      // Extend selection
      setSelection({
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: row,
        endCol: col,
      });
    } else {
      // Start new selection
      setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
      setIsSelecting(true);
    }
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isSelecting && selection) {
      setSelection({
        ...selection,
        endRow: row,
        endCol: col,
      });
    }
    if (isDragging && dragPreview) {
      setDragPreview({ row, col });
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    if (isDragging && dragPreview && selection) {
      handleDragFill();
    }
    setIsDragging(false);
    setDragPreview(null);
  };

  const handleFillHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragFill = () => {
    if (!selection || !dragPreview) return;

    const { startRow, startCol, endRow, endCol } = selection;
    const fillToRow = dragPreview.row;

    const newRows = [...rows];

    // Get the pattern from selected cells
    const selectedData: string[][] = [];
    for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
      const rowData: string[] = [];
      for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
        rowData.push(getCellValue(rows[r], COLUMNS[c].key));
      }
      selectedData.push(rowData);
    }

    // Fill down
    if (fillToRow > Math.max(startRow, endRow)) {
      let patternIndex = 0;
      for (let r = Math.max(startRow, endRow) + 1; r <= fillToRow; r++) {
        if (r >= newRows.length) {
          newRows.push({
            id: `row-${newRows.length + 1}`,
            prompt: '',
            model: 'gpt-4o',
            temperature: 0.7,
          });
        }

        for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
          const colIndex = c - Math.min(startCol, endCol);
          const value = selectedData[patternIndex][colIndex];
          setCellValue(r, COLUMNS[c].key, value);
        }

        patternIndex = (patternIndex + 1) % selectedData.length;
      }
    }

    setRows(newRows);
  };

  const handleCopy = () => {
    if (!selection) return;

    const { startRow, startCol, endRow, endCol } = selection;
    const data: string[][] = [];

    for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
      const rowData: string[] = [];
      for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
        rowData.push(getCellValue(rows[r], COLUMNS[c].key));
      }
      data.push(rowData);
    }

    const text = data.map((row) => row.join('\t')).join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleCut = () => {
    handleCopy();
    handleDelete();
  };

  const handlePaste = async () => {
    if (!selection) return;

    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split('\n').filter((line) => line.trim());
      const data = lines.map((line) => line.split('\t'));

      const { startRow, startCol } = selection;
      const newRows = [...rows];

      data.forEach((rowData, i) => {
        const targetRow = startRow + i;

        // Add new rows if needed
        while (targetRow >= newRows.length) {
          newRows.push({
            id: `row-${newRows.length + 1}`,
            prompt: '',
            model: 'gpt-4o',
            temperature: 0.7,
          });
        }

        rowData.forEach((cellValue, j) => {
          const targetCol = startCol + j;
          if (targetCol < COLUMNS.length) {
            const colKey = COLUMNS[targetCol].key;
            const row = newRows[targetRow];

            switch (colKey) {
              case 'temperature': {
                const temp = parseFloat(cellValue);
                row.temperature = isNaN(temp) ? undefined : temp;
                break;
              }
              case 'prompt':
                row.prompt = cellValue || '';
                break;
              case 'system':
                row.system = cellValue || undefined;
                break;
              case 'model':
                row.model = cellValue || undefined;
                break;
            }
          }
        });
      });

      setRows(newRows);
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  };

  const handleDelete = () => {
    if (!selection) return;

    const { startRow, startCol, endRow, endCol } = selection;

    for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
      for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
        setCellValue(r, COLUMNS[c].key, '');
      }
    }
  };

  const handleArrowNavigation = (key: string) => {
    if (!selection) return;

    const { startRow, startCol } = selection;
    let newRow = startRow;
    let newCol = startCol;

    switch (key) {
      case 'ArrowUp':
        newRow = Math.max(0, startRow - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(rows.length - 1, startRow + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, startCol - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(COLUMNS.length - 1, startCol + 1);
        break;
    }

    setSelection({
      startRow: newRow,
      startCol: newCol,
      endRow: newRow,
      endCol: newCol,
    });
  };

  const handleAddRow = () => {
    const newRow: BatchRow = {
      id: `row-${rows.length + 1}`,
      prompt: '',
      model: 'gpt-4o',
      temperature: 0.7,
    };
    setRows([...rows, newRow]);
  };

  const handleDeleteRows = () => {
    if (!selection) return;

    const { startRow, endRow } = selection;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    const newRows = rows.filter((_, index) => index < minRow || index > maxRow);
    setRows(newRows);
    setSelection(null);
  };

  const handleExportCSV = () => {
    const csvData = rows.map((row) => ({
      prompt: row.prompt,
      model: row.model || '',
      system: row.system || '',
      temperature: row.temperature || '',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', fileName || 'edited-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isCellSelected = (row: number, col: number) => {
    if (!selection) return false;
    const { startRow, startCol, endRow, endCol } = selection;
    return (
      row >= Math.min(startRow, endRow) &&
      row <= Math.max(startRow, endRow) &&
      col >= Math.min(startCol, endCol) &&
      col <= Math.max(startCol, endCol)
    );
  };

  const isCellInDragPreview = (row: number, col: number) => {
    if (!selection || !dragPreview) return false;
    const { startRow, endRow } = selection;
    const maxSelectedRow = Math.max(startRow, endRow);
    return (
      row > maxSelectedRow &&
      row <= dragPreview.row &&
      col >= Math.min(selection.startCol, selection.endCol) &&
      col <= Math.max(selection.startCol, selection.endCol)
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Edit Template</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              {fileName ? `Editing: ${fileName}` : 'Edit your batch processing template'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              Add Row
            </button>
            <button
              onClick={handleDeleteRows}
              disabled={!selection}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
            >
              Delete Rows
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors text-sm"
            >
              Export CSV
            </button>
            <button
              onClick={() => onSave(rows)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Apply Changes
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Spreadsheet */}
        <div
          ref={tableRef}
          className="flex-1 overflow-auto p-4"
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="inline-block min-w-full">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 w-12">
                    #
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="border border-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-300"
                      style={{ width: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.id}>
                    <td className="border border-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 text-sm text-center text-gray-600 dark:text-gray-400">
                      {rowIndex + 1}
                    </td>
                    {COLUMNS.map((col, colIndex) => {
                      const isSelected = isCellSelected(rowIndex, colIndex);
                      const isEditing =
                        editingCell?.row === rowIndex && editingCell?.col === colIndex;
                      const isInDragPreview = isCellInDragPreview(rowIndex, colIndex);
                      const showFillHandle =
                        selection &&
                        rowIndex === Math.max(selection.startRow, selection.endRow) &&
                        colIndex === Math.max(selection.startCol, selection.endCol);

                      return (
                        <td
                          key={col.key}
                          className={`
                            border border-gray-300 px-1 py-0.5 text-sm relative
                            ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-white dark:bg-gray-900'}
                            ${isInDragPreview ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                            ${isEditing ? 'p-0' : 'cursor-cell'}
                          `}
                          onMouseDown={(e) =>
                            !isEditing && handleCellMouseDown(rowIndex, colIndex, e)
                          }
                          onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                          onDoubleClick={() => !isEditing && startEditing(rowIndex, colIndex)}
                        >
                          {isEditing ? (
                            col.key === 'model' ? (
                              <select
                                ref={selectRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={finishEditing}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') finishEditing();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full h-full px-1 py-0.5 border-0 outline-none bg-white dark:bg-gray-900"
                              >
                                <option value="">Default</option>
                                {MODELS.map((model) => (
                                  <option key={model.value} value={model.value}>
                                    {model.label}
                                  </option>
                                ))}
                              </select>
                            ) : col.key === 'prompt' || col.key === 'system' ? (
                              <textarea
                                ref={textareaRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={finishEditing}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    finishEditing();
                                  }
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full min-h-[24px] px-1 py-0.5 border-0 outline-none resize-none bg-white dark:bg-gray-900"
                                style={{ height: 'auto' }}
                              />
                            ) : (
                              <input
                                ref={inputRef}
                                type={col.key === 'temperature' ? 'number' : 'text'}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={finishEditing}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') finishEditing();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                step={col.key === 'temperature' ? '0.1' : undefined}
                                min={col.key === 'temperature' ? '0' : undefined}
                                max={col.key === 'temperature' ? '2' : undefined}
                                className="w-full h-full px-1 py-0.5 border-0 outline-none bg-white dark:bg-gray-900"
                              />
                            )
                          ) : (
                            <div className="truncate">
                              {col.key === 'model'
                                ? MODELS.find((m) => m.value === getCellValue(row, col.key))
                                    ?.label ||
                                  getCellValue(row, col.key) ||
                                  'Default'
                                : getCellValue(row, col.key)}
                            </div>
                          )}
                          {showFillHandle && (
                            <div
                              className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 cursor-crosshair"
                              onMouseDown={handleFillHandleMouseDown}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
            <div>
              {rows.length} row{rows.length !== 1 ? 's' : ''}
            </div>
            <div>
              Tips: Double-click to edit • Ctrl+C/V to copy/paste • Drag corner handle to fill down
              • Shift+click to select range
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
