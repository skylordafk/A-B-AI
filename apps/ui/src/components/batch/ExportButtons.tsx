import React from 'react';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import type { BatchResult, CostEstimation, BatchJobManifest } from '../../types/batch';

interface ExportButtonsProps {
  results: BatchResult[];
  inputFileName: string;
  estimation?: CostEstimation | null;
}

export default function ExportButtons({ results, inputFileName, estimation }: ExportButtonsProps) {
  const generateTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}-${hours}${minutes}`;
  };

  const handleExportCSV = () => {
    // Prepare data for CSV
    const csvData = results.map((result) => ({
      id: result.id,
      prompt: result.prompt,
      model: result.model,
      status: result.status,
      response: result.response || '',
      tokens_in: result.tokens_in || 0,
      tokens_out: result.tokens_out || 0,
      cost_usd: result.cost_usd || 0,
      latency_ms: result.latency_ms || 0,
      error: result.error || '',
    }));

    // Convert to CSV
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });

    // Save file
    const timestamp = generateTimestamp();
    saveAs(blob, `results-${timestamp}.csv`);
  };

  const handleExportManifest = () => {
    const timestamp = generateTimestamp();

    // Calculate summary statistics
    const successCount = results.filter((r) => r.status === 'success').length;
    const failedCount = results.filter((r) => r.status !== 'success').length;
    const totalCost = results.reduce((sum, r) => sum + (r.cost_usd || 0), 0);

    // Create manifest
    const manifest: BatchJobManifest = {
      inputFile: inputFileName,
      timestamp: new Date().toISOString(),
      settings: {
        concurrency: 3, // This would ideally come from props
        dryRunCost: estimation?.totalUSD,
      },
      summary: {
        totalRows: results.length,
        success: successCount,
        failed: failedCount,
        totalCostUSD: totalCost,
      },
      rows: results.map((result) => ({
        id: result.id,
        promptHash: btoa(result.prompt).substring(0, 8), // Simple hash
        status: result.status,
        provider: result.model.split('/')[0] || 'unknown',
        latency_ms: result.latency_ms,
        cost_usd: result.cost_usd,
      })),
    };

    // Save manifest
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    saveAs(blob, `job-${timestamp}.abaijob`);
  };

  return (
    <div className="flex gap-3 justify-end">
      <button
        onClick={handleExportCSV}
        className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Download Results CSV
      </button>

      <button
        onClick={handleExportManifest}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Export Job Manifest
      </button>
    </div>
  );
}
