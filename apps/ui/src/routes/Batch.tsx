import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ActivitySidebar from '../components/sidebars/ActivitySidebar';
import SpreadsheetEditor from '../components/batch/SpreadsheetEditor';
import SettingsModal from '../components/SettingsModal';
import { useProjectStore } from '../store/projectStore';
import { parseInput } from '../lib/batch/parseInput';
import { templateService, type Template } from '../lib/batch/templateService';
import type { BatchRow } from '../types/batch';

export default function Batch() {
  const _navigate = useNavigate();
  const { createBatchJob, currentProjectId } = useProjectStore();
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [useNativeAPI, setUseNativeAPI] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  // Listen for settings menu events
  useEffect(() => {
    const handleMenuSettings = () => setSettingsOpen(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).ipc?.onOpenSettings?.(handleMenuSettings);
  }, []);

  // Initialize with empty row if no data
  useEffect(() => {
    if (rows.length === 0) {
      setRows([
        {
          id: 'row-1',
          prompt: '',
          model: 'gpt-4o',
          temperature: 0.7,
        },
      ]);
    }
  }, [rows.length]);

  const handleImport = useCallback(async (file: File) => {
    try {
      const { rows: parsedRows } = await parseInput(file);
      setRows(parsedRows);
    } catch (error) {
      console.error('Failed to import file:', error);
      alert('Failed to import file. Please check the format and try again.');
    }
  }, []);

  const handleTemplateSelect = useCallback(
    async (template: Template) => {
      try {
        const file = await templateService.downloadTemplateAsFile(template);
        await handleImport(file);
      } catch (error) {
        console.error('Failed to load template:', error);
        alert('Failed to load template. Please try again.');
      }
    },
    [handleImport]
  );

  const handleRunBatch = useCallback(async () => {
    if (!currentProjectId || rows.length === 0 || isRunning) return;

    try {
      setIsRunning(true);
      const newJobId = await createBatchJob('batch-job', rows, useNativeAPI);
      setJobId(newJobId);
    } catch (error) {
      console.error('Failed to run batch:', error);
      alert('Failed to run batch. Please try again.');
    } finally {
      setIsRunning(false);
    }
  }, [currentProjectId, rows, useNativeAPI, isRunning, createBatchJob]);

  return (
    <Layout rightSidebar={<ActivitySidebar />}>
      <div className="flex flex-col h-full">
        {/* Header Toolbar */}
        <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">Batch Processing</h1>

              {/* Import Options */}
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImport(file);
                  }}
                  className="hidden"
                  id="file-import"
                />
                <label
                  htmlFor="file-import"
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer text-sm"
                >
                  Import CSV/JSON
                </label>

                <button
                  onClick={() => {
                    // Show template browser (simplified for now)
                    templateService.getTemplates().then((templates) => {
                      if (templates.length > 0) {
                        handleTemplateSelect(templates[0]);
                      }
                    });
                  }}
                  className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                >
                  Load Template
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Native Batch API Toggle */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useNativeAPI}
                  onChange={(e) => setUseNativeAPI(e.target.checked)}
                />
                <span className="text-[var(--text-primary)]">
                  Use Provider's Batch API (faster for large batches)
                </span>
              </label>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleRunBatch}
                  disabled={isRunning || rows.length === 0}
                  className="px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                >
                  {isRunning ? 'Processing...' : 'Run Batch'}
                </button>
              </div>
            </div>
          </div>

          {jobId && (
            <div className="mt-2 text-sm text-[var(--text-secondary)]">
              Job ID: {jobId} | Status: {isRunning ? 'Processing' : 'Completed'}
            </div>
          )}
        </div>

        {/* Main Spreadsheet Area */}
        <div className="flex-1 overflow-hidden">
          <SpreadsheetEditor
            rows={rows}
            onSave={setRows}
            onCancel={() => {
              // Reset to empty state
              setRows([
                {
                  id: 'row-1',
                  prompt: '',
                  model: 'gpt-4o',
                  temperature: 0.7,
                },
              ]);
            }}
            fileName="batch-template.csv"
          />
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Layout>
  );
}
