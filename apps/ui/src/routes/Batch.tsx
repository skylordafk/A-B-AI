import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BatchLayout from '../components/batch/BatchLayout';
import BatchDropZone from '../components/batch/BatchDropZone';
import BatchProgressToast from '../components/batch/BatchProgressToast';
import ResultsTable from '../components/batch/ResultsTable';
import ExportButtons from '../components/batch/ExportButtons';
import DryRunModal from '../components/batch/DryRunModal';
import TemplateBrowser from '../components/batch/TemplateBrowser';
import SettingsModal from '../components/SettingsModal';
import { BatchProvider, useBatch } from '../contexts/BatchContext';
import { useChat } from '../contexts/ChatContext';
import { parseInput } from '../lib/batch/parseInput';
import { estimateCost } from '../lib/batch/estimateCost';
import { JobQueue } from '../lib/batch/JobQueue';
import { templateService, type Template } from '../lib/batch/templateService';
import type { BatchResult } from '../types/batch';

function BatchContent() {
  const navigate = useNavigate();
  const { state, dispatch } = useBatch();
  const { pushBatchSummary } = useChat();
  const [concurrency, setConcurrency] = useState(3);
  const [file, setFile] = useState<File | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [showDryRunModal, setShowDryRunModal] = useState(false);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Listen for settings menu events
  useEffect(() => {
    const handleMenuSettings = () => setSettingsOpen(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).ipc.onOpenSettings(handleMenuSettings);
  }, []);

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      dispatch({ type: 'SET_FILE', payload: selectedFile });

      // Parse and validate the file
      const { rows, errors } = await parseInput(selectedFile);
      dispatch({ type: 'SET_ROWS', payload: { rows, errors } });

      if (rows.length > 0) {
        // Estimate cost
        const estimation = await estimateCost(rows);
        setEstimatedCost(estimation.totalUSD);
        dispatch({ type: 'SET_ESTIMATION', payload: estimation });
      }
    },
    [dispatch]
  );

  const handleTemplateSelect = useCallback(
    async (template: Template) => {
      try {
        // Download the template as a file
        const file = await templateService.downloadTemplateAsFile(template);
        handleFileSelect(file);
        setShowTemplateBrowser(false);
      } catch (error) {
        console.error('Failed to load template:', error);
      }
    },
    [handleFileSelect]
  );

  const handleDownloadSample = useCallback(async () => {
    try {
      // Get the basic template from the template service
      const templates = await templateService.getTemplates();
      const basicTemplate = templates.find((t) => t.id === 'basic-template') || templates[0];

      if (basicTemplate) {
        // Download the template content
        const content = await templateService.downloadTemplate(basicTemplate);

        // Create a blob and download link
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'batch-template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download sample template:', error);
      alert('Failed to download sample template. Please try again.');
    }
  }, []);

  const handleClearFile = useCallback(() => {
    setFile(null);
    setEstimatedCost(null);
    setResults([]);
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  const handleDryRun = useCallback(async () => {
    if (!state.rows || state.rows.length === 0) return;

    const estimation = await estimateCost(state.rows);
    dispatch({ type: 'SET_ESTIMATION', payload: estimation });
    setShowDryRunModal(true);
  }, [state.rows, dispatch]);

  const [currentQueue, setCurrentQueue] = useState<JobQueue | null>(null);

  const handleRunBatch = useCallback(async () => {
    if (!state.rows || state.rows.length === 0 || isRunning) return;

    setIsRunning(true);
    const queue = new JobQueue(concurrency);
    setCurrentQueue(queue);

    const startTime = Date.now();
    const results: BatchResult[] = [];

    // Subscribe to queue events
    queue.on('progress', (progress) => {
      dispatch({ type: 'UPDATE_PROGRESS', payload: progress });
    });

    queue.on('row-done', (result) => {
      results.push(result);
      setResults((prev) => [...prev, result]);
      dispatch({ type: 'ADD_RESULT', payload: result });
    });

    queue.on('row-error', (error) => {
      dispatch({ type: 'ADD_ERROR', payload: error });
    });

    queue.on('batch-summary', (summary) => {
      // Add batch summary to chat history
      pushBatchSummary(summary);
    });

    queue.on('stopped', (info) => {
      console.warn(
        `Batch ${info.batchId} stopped gracefully: ${info.processedRows}/${info.totalRows} completed`
      );
      setIsRunning(false);
      setCurrentQueue(null);
    });

    queue.on('complete', () => {
      const endTime = Date.now();
      dispatch({
        type: 'COMPLETE',
        payload: {
          totalTime: endTime - startTime,
          totalCost: results.reduce((sum, r) => sum + (r.cost_usd || 0), 0),
        },
      });
      setIsRunning(false);
      setCurrentQueue(null);
    });

    // Enqueue all rows
    for (const row of state.rows) {
      queue.enqueue(row);
    }

    // Start processing
    try {
      await queue.start();
    } catch (error) {
      console.error('Batch processing error:', error);
      setIsRunning(false);
      setCurrentQueue(null);
    }
  }, [state.rows, concurrency, isRunning, dispatch, pushBatchSummary]);

  const handleStopBatch = useCallback(async () => {
    if (currentQueue && isRunning) {
      console.warn('Initiating graceful shutdown...');
      await currentQueue.stop(true); // Save state for resume
    }
  }, [currentQueue, isRunning]);

  const _handleResumeBatch = useCallback(
    async (batchId: string) => {
      if (isRunning) return;

      try {
        setIsRunning(true);
        const queue = await JobQueue.resume(batchId, concurrency);
        setCurrentQueue(queue);

        const _startTime = Date.now();
        const results: BatchResult[] = [];

        // Subscribe to events (same as handleRunBatch)
        queue.on('progress', (progress) => {
          dispatch({ type: 'UPDATE_PROGRESS', payload: progress });
        });

        queue.on('row-done', (result) => {
          results.push(result);
          setResults((prev) => [...prev, result]);
          dispatch({ type: 'ADD_RESULT', payload: result });
        });

        queue.on('complete', () => {
          setIsRunning(false);
          setCurrentQueue(null);
        });

        queue.on('stopped', () => {
          setIsRunning(false);
          setCurrentQueue(null);
        });

        await queue.start();
      } catch (error) {
        console.error('Failed to resume batch:', error);
        setIsRunning(false);
        setCurrentQueue(null);
      }
    },
    [concurrency, isRunning, dispatch]
  );

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
      <BatchLayout
        concurrency={concurrency}
        onConcurrencyChange={setConcurrency}
        onNavigateToChat={() => navigate('/chat')}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {!file ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <button
                onClick={() => setShowTemplateBrowser(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                Browse Templates
              </button>
            </div>

            <div className="text-center text-[var(--text-secondary)] text-sm">Or</div>

            <BatchDropZone
              onFileSelect={handleFileSelect}
              onTemplateBrowse={() => setShowTemplateBrowser(true)}
              onDownloadSample={handleDownloadSample}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{file.name}</h3>
                  {estimatedCost !== null && (
                    <p className="text-[var(--text-secondary)] mt-1">
                      Input token cost: ${estimatedCost.toFixed(8)}
                    </p>
                  )}
                  {state.errors && state.errors.length > 0 && (
                    <p className="text-amber-500 mt-1">{state.errors.length} rows with errors</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClearFile}
                    className="px-4 py-2 bg-[var(--bg-primary)] border border-red-300 text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    disabled={isRunning}
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleDryRun}
                    className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors"
                    disabled={isRunning}
                  >
                    Dry-Run Estimate
                  </button>
                  {isRunning ? (
                    <button
                      onClick={handleStopBatch}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Stop Batch
                    </button>
                  ) : (
                    <button
                      onClick={handleRunBatch}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                      disabled={!state.rows || state.rows.length === 0}
                    >
                      Run Batch
                    </button>
                  )}
                </div>
              </div>
            </div>

            {(results.length > 0 || isRunning) && (
              <>
                <ResultsTable results={results} />
                {results.length > 0 && !isRunning && (
                  <ExportButtons
                    results={results}
                    inputFileName={file.name}
                    estimation={state.estimation}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>

      {isRunning && state.progress && <BatchProgressToast progress={state.progress} />}

      <DryRunModal
        isOpen={showDryRunModal}
        onClose={() => setShowDryRunModal(false)}
        estimation={state.estimation}
        rows={state.rows || []}
      />

      {showTemplateBrowser && (
        <TemplateBrowser
          onTemplateSelect={handleTemplateSelect}
          onClose={() => setShowTemplateBrowser(false)}
        />
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function Batch() {
  return (
    <BatchProvider>
      <BatchContent />
    </BatchProvider>
  );
}
