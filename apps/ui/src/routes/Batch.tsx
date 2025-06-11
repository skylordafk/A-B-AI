import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BatchLayout from '../components/batch/BatchLayout';
import BatchDropZone from '../components/batch/BatchDropZone';
import BatchProgressToast from '../components/batch/BatchProgressToast';
import ResultsTable from '../components/batch/ResultsTable';
import ExportButtons from '../components/batch/ExportButtons';
import DryRunModal from '../components/batch/DryRunModal';
import TemplateBrowser from '../components/batch/TemplateBrowser';
import { BatchProvider, useBatch } from '../contexts/BatchContext';
import { parseInput } from '../lib/batch/parseInput';
import { estimateCost } from '../lib/batch/estimateCost';
import { JobQueue } from '../lib/batch/JobQueue';
import { templateService, type Template } from '../lib/batch/templateService';
import type { BatchResult } from '../types/batch';

function BatchContent() {
  const navigate = useNavigate();
  const { state, dispatch } = useBatch();
  const [concurrency, setConcurrency] = useState(3);
  const [file, setFile] = useState<File | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [showDryRunModal, setShowDryRunModal] = useState(false);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);

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

  const handleDryRun = useCallback(async () => {
    if (!state.rows || state.rows.length === 0) return;

    const estimation = await estimateCost(state.rows);
    dispatch({ type: 'SET_ESTIMATION', payload: estimation });
    setShowDryRunModal(true);
  }, [state.rows, dispatch]);

  const handleRunBatch = useCallback(async () => {
    if (!state.rows || state.rows.length === 0 || isRunning) return;

    setIsRunning(true);
    const queue = new JobQueue(concurrency);

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
    });

    // Enqueue all rows
    for (const row of state.rows) {
      queue.enqueue(row);
    }

    // Start processing
    await queue.start();
  }, [state.rows, concurrency, isRunning, dispatch]);

  const handleTemplateSelect = useCallback(
    async (template: Template) => {
      try {
        const templateFile = await templateService.downloadTemplateAsFile(template);
        await handleFileSelect(templateFile);
      } catch (error) {
        console.error('Failed to load template:', error);
        // You could add toast notification here
      }
    },
    [handleFileSelect]
  );

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
      <BatchLayout
        concurrency={concurrency}
        onConcurrencyChange={setConcurrency}
        onNavigateToChat={() => navigate('/chat')}
        onOpenTemplateBrowser={() => setShowTemplateBrowser(true)}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {!file ? (
          <BatchDropZone onFileSelect={handleFileSelect} />
        ) : (
          <div className="space-y-6">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{file.name}</h3>
                  {estimatedCost !== null && (
                    <p className="text-[var(--text-secondary)] mt-1">
                      Input token cost: ${estimatedCost.toFixed(2)}
                    </p>
                  )}
                  {state.errors && state.errors.length > 0 && (
                    <p className="text-amber-500 mt-1">{state.errors.length} rows with errors</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDryRun}
                    className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors"
                    disabled={isRunning}
                  >
                    Dry-Run Estimate
                  </button>
                  <button
                    onClick={handleRunBatch}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={isRunning || !state.rows || state.rows.length === 0}
                  >
                    {isRunning ? 'Running...' : 'Run Batch'}
                  </button>
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
