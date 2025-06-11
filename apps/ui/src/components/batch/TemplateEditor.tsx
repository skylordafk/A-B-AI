import { useState, useEffect } from 'react';
import type { BatchRow } from '../../types/batch';
import Papa from 'papaparse';

interface TemplateEditorProps {
  rows: BatchRow[];
  onSave: (rows: BatchRow[]) => void;
  onCancel: () => void;
  fileName?: string;
}

export default function TemplateEditor({
  rows: initialRows,
  onSave,
  onCancel,
  fileName,
}: TemplateEditorProps) {
  const [rows, setRows] = useState<BatchRow[]>(initialRows);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [editingRow, setEditingRow] = useState<BatchRow | null>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const handleAddRow = () => {
    const newRow: BatchRow = {
      id: `row-${rows.length + 1}`,
      prompt: '',
      model: 'gpt-4o',
      temperature: 0.7,
    };
    setRows([...rows, newRow]);
    setSelectedRowIndex(rows.length);
    setEditingRow(newRow);
  };

  const handleDeleteRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
    setSelectedRowIndex(null);
    setEditingRow(null);
  };

  const handleDuplicateRow = (index: number) => {
    const rowToDuplicate = rows[index];
    const newRow: BatchRow = {
      ...rowToDuplicate,
      id: `row-${rows.length + 1}`,
    };
    const newRows = [...rows];
    newRows.splice(index + 1, 0, newRow);
    setRows(newRows);
  };

  const handleRowChange = (field: keyof BatchRow, value: string | number | undefined) => {
    if (editingRow && selectedRowIndex !== null) {
      const updatedRow = { ...editingRow, [field]: value };
      setEditingRow(updatedRow);

      const newRows = [...rows];
      newRows[selectedRowIndex] = updatedRow;
      setRows(newRows);
    }
  };

  const handleSave = () => {
    onSave(rows);
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

  const getModelDisplayName = (model?: string) => {
    const modelMap: Record<string, string> = {
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
      'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
      'claude-3-opus-20240229': 'Claude 3 Opus',
      'o1-preview': 'o1-preview',
      'o1-mini': 'o1-mini',
    };
    return modelMap[model || ''] || model || 'Default';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Edit Template</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              {fileName ? `Editing: ${fileName}` : 'Edit your batch processing template'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Apply Changes
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Row List */}
          <div className="w-1/3 border-r border-[var(--border)] overflow-y-auto">
            <div className="p-4 border-b border-[var(--border)]">
              <button
                onClick={handleAddRow}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add New Row
              </button>
            </div>

            <div className="p-4 space-y-2">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedRowIndex === index
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-[var(--border)] hover:border-blue-400'
                  }`}
                  onClick={() => {
                    setSelectedRowIndex(index);
                    setEditingRow(row);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        Row {index + 1}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] truncate">
                        {row.prompt || '(Empty prompt)'}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        {getModelDisplayName(row.model)}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateRow(index);
                        }}
                        className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="Duplicate row"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRow(index);
                        }}
                        className="p-1 text-red-500 hover:text-red-600"
                        title="Delete row"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-y-auto p-6">
            {editingRow && selectedRowIndex !== null ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Prompt
                  </label>
                  <textarea
                    value={editingRow.prompt}
                    onChange={(e) => handleRowChange('prompt', e.target.value)}
                    className="w-full h-32 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your prompt here..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    System Message (Optional)
                  </label>
                  <textarea
                    value={editingRow.system || ''}
                    onChange={(e) => handleRowChange('system', e.target.value || undefined)}
                    className="w-full h-24 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter system message..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Model
                    </label>
                    <select
                      value={editingRow.model || ''}
                      onChange={(e) => handleRowChange('model', e.target.value || undefined)}
                      className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Default Model</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                      <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                      <option value="o1-preview">o1-preview</option>
                      <option value="o1-mini">o1-mini</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Temperature
                    </label>
                    <input
                      type="number"
                      value={editingRow.temperature || ''}
                      onChange={(e) =>
                        handleRowChange(
                          'temperature',
                          e.target.value ? parseFloat(e.target.value) : undefined
                        )
                      }
                      step="0.1"
                      min="0"
                      max="2"
                      className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.7"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                Select a row to edit or add a new row
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-between">
            <p className="text-[var(--text-muted)] text-sm">
              {rows.length} row{rows.length !== 1 ? 's' : ''} in template
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
