import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ActivitySidebar from '../components/sidebars/ActivitySidebar';
import SpreadsheetEditor from '../components/batch/SpreadsheetEditor';
import SettingsModal from '../components/SettingsModal';
import BatchProgressToast from '../components/batch/BatchProgressToast';
import { useProjectStore } from '../store/projectStore';
import { parseInput } from '../lib/batch/parseInput';
import { templateService, type Template } from '../lib/batch/templateService';
import { JobQueue } from '../lib/batch/JobQueue';
import type { BatchRow, BatchProgress, BatchResult } from '../types/batch';

// Map of incorrect model IDs to correct ones
const MODEL_ID_FIXES: Record<string, string> = {
  // OpenAI fixes
  'gpt-4.1-mini': 'openai/gpt-4o-mini',
  'gpt-4.1': 'openai/gpt-4.1',
  'openai/gpt-4.1-mini': 'openai/gpt-4o-mini',
  'openai/gpt-4.1': 'openai/gpt-4.1',

  // Claude fixes
  'anthropic/claude-sonnet-4': 'anthropic/claude-4-sonnet',
  'anthropic/claude-3-5-haiku': 'anthropic/claude-3-5-haiku-20241022',

  // Gemini fixes (prioritize 2.5 models)
  'gemini/models/gemini-2.5-pro-thinking': 'gemini/models/gemini-2.5-pro-thinking',
  'gemini/models/gemini-2.5-flash-preview': 'gemini/models/gemini-2.5-flash-preview',

  // Grok fixes (map to Grok 3)
  'grok/grok-3': 'grok/grok-3',
  'grok/grok-3-mini': 'grok/grok-3-mini',
  'grok/grok-2-1212': 'grok/grok-3',
  'grok/grok-2-vision-1212': 'grok/grok-3',

  // Default mapping for models that show as just the name
  'GPT-4o': 'openai/gpt-4o',
  'GPT-4o Mini': 'openai/gpt-4o-mini',
  'Claude 3.5 Sonnet': 'anthropic/claude-3-5-sonnet-20241022',
  'Claude 3.5 Haiku': 'anthropic/claude-3-5-haiku-20241022',
  'Gemini 1.5 Pro': 'gemini/models/gemini-2.5-pro-thinking',
  'Gemini 1.5 Flash': 'gemini/models/gemini-2.5-flash-preview',
  'Grok 2': 'grok/grok-3',
};

// Function to map batch result status to UI status
const getUIStatus = (status: string): string => {
  switch (status) {
    case 'success':
      return 'completed';
    case 'error':
    case 'error-api':
    case 'error-missing-key':
    case 'failed':
      return 'failed';
    case 'processing':
      return 'processing';
    default:
      return 'pending';
  }
};

export default function Batch() {
  const _navigate = useNavigate();
  const { createBatchJob, currentProjectId } = useProjectStore();
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [useNativeAPI, setUseNativeAPI] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [jobQueue, setJobQueue] = useState<JobQueue | null>(null);
  const [jobResults, setJobResults] = useState<Map<string, BatchResult>>(new Map());

  // Function to fix incorrect model IDs
  const fixModelIDs = useCallback((rows: BatchRow[]): BatchRow[] => {
    return rows.map((row) => {
      if (row.model && MODEL_ID_FIXES[row.model]) {
        return { ...row, model: MODEL_ID_FIXES[row.model] };
      }
      return row;
    });
  }, []);

  // Listen for settings menu events
  useEffect(() => {
    const handleMenuSettings = () => setSettingsOpen(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).ipc?.onOpenSettings?.(handleMenuSettings);
  }, []);

  // Initialize with 1 empty row on mount if no data
  useEffect(() => {
    if (rows.length === 0) {
      const initialRows = [
        {
          id: 'row-1',
          prompt: '',
          model: 'openai/gpt-4o',
          temperature: 0.7,
        },
      ];
      setRows(initialRows);
    } else {
      // Fix any incorrect model IDs in existing rows
      const fixedRows = fixModelIDs(rows);
      if (JSON.stringify(fixedRows) !== JSON.stringify(rows)) {
        setRows(fixedRows);
      }
    }
  }, []);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const { rows: parsedRows } = await parseInput(file);
        const fixedRows = fixModelIDs(parsedRows);
        setRows(fixedRows);
      } catch (error) {
        console.error('Failed to import file:', error);
        alert('Failed to import file. Please check the format and try again.');
      }
    },
    [fixModelIDs]
  );

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

      // Clear previous results
      setJobResults(new Map());

      // First, create the batch job (this validates API keys)
      const newJobId = await createBatchJob('batch-job', rows, useNativeAPI);
      setJobId(newJobId);

      // If using native API, don't start JobQueue - let the provider handle it
      if (useNativeAPI) {
        return;
      }

      // For non-native batches, start processing with JobQueue

      // Create and configure JobQueue
      const queue = new JobQueue(3, `batch-${newJobId}`, window.api);
      setJobQueue(queue);

      // Set up event listeners for progress tracking
      queue.on('progress', (progressData: BatchProgress) => {
        setProgress(progressData);
      });

      queue.on('row-done', (result: BatchResult) => {
        // Update job results map
        setJobResults((prev) => {
          const newResults = new Map(prev);
          newResults.set(result.id, result);
          return newResults;
        });

        // Update the rows array with the result
        setRows((prevRows) =>
          prevRows.map((row) =>
            row.id === result.id
              ? {
                  ...row,
                  status: getUIStatus(result.status),
                  response: result.response || '',
                  cost_usd: result.cost_usd || 0,
                  latency_ms: result.latency_ms || 0,
                  error:
                    result.status !== 'success'
                      ? result.error || result.errorMessage || 'Unknown error'
                      : undefined,
                }
              : row
          )
        );
      });

      queue.on('complete', () => {
        setIsRunning(false);
        setProgress(null);
        setJobQueue(null);
        alert('✅ Batch processing completed successfully!');
      });

      queue.on('failed', (error) => {
        console.error('Batch processing failed:', error);
        setIsRunning(false);
        setProgress(null);
        setJobQueue(null);
        alert(`❌ Batch processing failed: ${error.reason || 'Unknown error'}`);
      });

      queue.on('stopped', (_info) => {
        setIsRunning(false);
        setProgress(null);
        setJobQueue(null);
      });

      // Set initial status for all rows
      setRows((prevRows) => prevRows.map((row) => ({ ...row, status: 'processing' })));

      // Enqueue all rows
      rows.forEach((row) => {
        queue.enqueue(row);
      });

      // Start processing
      await queue.start();
    } catch (error: any) {
      console.error('Failed to run batch:', error);

      // Show specific error message for missing API keys
      if (error.message && error.message.includes('Missing API keys')) {
        alert(
          `❌ Batch Job Failed\n\n${error.message}\n\n` +
            `💡 Go to Settings to configure your API keys before running batch jobs.`
        );
      } else {
        alert(`Failed to run batch: ${error.message || 'Unknown error'}`);
      }
      setIsRunning(false);
      setProgress(null);
      setJobQueue(null);
    }
  }, [currentProjectId, rows, useNativeAPI, isRunning, createBatchJob]);

  // Stop batch processing
  const handleStopBatch = useCallback(async () => {
    if (jobQueue && isRunning) {
      await jobQueue.stop(true); // Save state for potential resume
    }
  }, [jobQueue, isRunning]);

  return (
    <Layout rightSidebar={<ActivitySidebar />}>
      <div className="flex flex-col h-full">
        {/* Header Toolbar */}
        <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">Batch Processing</h1>

              {/* Template Options */}
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const templates = await templateService.getTemplates();
                      if (templates.length > 0) {
                        const template = templates[0]; // Use the single batch template
                        await handleTemplateSelect(template);
                      }
                    } catch (error) {
                      console.error('Failed to load template:', error);
                      alert('Failed to load template. Please try again.');
                    }
                  }}
                  className="px-3 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors text-sm"
                  title="Load default batch template with example prompts"
                >
                  📋 Load Template
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
                  disabled={isRunning}
                />
                <span className="text-[var(--text-primary)]">
                  Use Provider's Batch API (faster for large batches)
                </span>
              </label>

              {/* JSON Mode Toggle */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={jsonMode}
                  onChange={(e) => setJsonMode(e.target.checked)}
                  disabled={isRunning}
                />
                <span className="text-[var(--text-primary)]">JSON Mode (structured output)</span>
              </label>

              {/* Actions */}
              <div className="flex gap-2">
                {isRunning && !useNativeAPI ? (
                  <button
                    onClick={handleStopBatch}
                    className="px-4 py-1 bg-[var(--accent-danger)] text-[var(--accent-danger-foreground)] rounded-md hover:bg-[var(--accent-danger-hover)] transition-colors text-sm"
                  >
                    Stop Batch
                  </button>
                ) : (
                  <button
                    onClick={handleRunBatch}
                    disabled={isRunning || rows.length === 0}
                    className="px-4 py-1 bg-[var(--accent-success)] text-[var(--accent-success-foreground)] rounded-md hover:bg-[var(--accent-success-hover)] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRunning ? 'Processing...' : 'Run Batch'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {jobId && (
            <div className="mt-2 text-sm text-[var(--text-secondary)]">
              Job ID: {jobId} | Status:{' '}
              {isRunning
                ? useNativeAPI
                  ? 'Processing via Provider API...'
                  : 'Processing Rows...'
                : 'Ready to Process'}
              {!isRunning && (
                <span className="text-[var(--text-muted)] ml-2">
                  (Check Activity sidebar for processing status)
                </span>
              )}
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
                  model: 'openai/gpt-4o',
                  temperature: 0.7,
                },
              ]);
            }}
            fileName="batch-template.csv"
            jobResults={jobResults}
            currentJobId={jobId || undefined}
          />
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Progress Toast */}
      {progress && <BatchProgressToast progress={progress} />}
    </Layout>
  );
}
