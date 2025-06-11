import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BatchLayout from '../components/batch/BatchLayout';
import BatchDropZone from '../components/batch/BatchDropZone';
import BatchProgressToast from '../components/batch/BatchProgressToast';
import ResultsTable from '../components/batch/ResultsTable';
import ExportButtons from '../components/batch/ExportButtons';
import DryRunModal from '../components/batch/DryRunModal';
import TemplateBrowser from '../components/batch/TemplateBrowser';
import TemplateEditor from '../components/batch/TemplateEditor';
import { BatchProvider, useBatch } from '../contexts/BatchContext';
import { parseInput } from '../lib/batch/parseInput';
import { estimateCost } from '../lib/batch/estimateCost';
import { JobQueue } from '../lib/batch/JobQueue';
import { templateService } from '../lib/batch/templateService';
import type { BatchResult, BatchRow } from '../types/batch';
import type { Template } from '../lib/batch/templateService';

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
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateRows, setTemplateRows] = useState<BatchRow[] | null>(null);
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);

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

        // Set up for editing
        setTemplateRows(rows);
        setTemplateFileName(selectedFile.name);
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

  const handleTemplateEdit = useCallback(() => {
    if (state.rows) {
      setTemplateRows(state.rows);
      setShowTemplateEditor(true);
    }
  }, [state.rows]);

  const handleTemplateSave = useCallback(
    async (editedRows: BatchRow[]) => {
      // Update the state with edited rows
      dispatch({ type: 'SET_ROWS', payload: { rows: editedRows, errors: [] } });

      // Re-estimate cost
      if (editedRows.length > 0) {
        const estimation = await estimateCost(editedRows);
        setEstimatedCost(estimation.totalUSD);
        dispatch({ type: 'SET_ESTIMATION', payload: estimation });
      }

      setShowTemplateEditor(false);
    },
    [dispatch]
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
    setTemplateRows(null);
    setTemplateFileName(null);
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
                      Input token cost: ${estimatedCost.toFixed(2)}
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
                    onClick={handleTemplateEdit}
                    className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors flex items-center gap-2"
                    disabled={isRunning || !state.rows || state.rows.length === 0}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit Template
                  </button>
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

      {showTemplateEditor && templateRows && (
        <TemplateEditor
          rows={templateRows}
          onSave={handleTemplateSave}
          onCancel={() => setShowTemplateEditor(false)}
          fileName={templateFileName || undefined}
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
