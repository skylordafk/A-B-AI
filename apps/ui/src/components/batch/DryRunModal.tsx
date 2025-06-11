import React from 'react';
import type { CostEstimation, BatchRow } from '../../types/batch';

interface DryRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimation: CostEstimation | null;
  rows: BatchRow[];
}

export default function DryRunModal({ isOpen, onClose, estimation, rows }: DryRunModalProps) {
  if (!isOpen || !estimation) return null;

  // Create a map of row details for display
  const rowDetails = estimation.perRow.map((est, _index) => {
    const row = rows.find((r) => r.id === est.id);
    return {
      ...est,
      prompt: row?.prompt || '',
      model: row?.model || 'openai/o3-2025-04-16',
      hasSystem: !!row?.system,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Dry-Run Input Token Estimate
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Summary */}
          <div className="mb-6 p-4 bg-[var(--bg-secondary)] rounded-md">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[var(--text-secondary)] text-sm">Total Rows</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {estimation.perRow.length}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-secondary)] text-sm">Total Input Tokens</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {estimation.perRow.reduce((sum, row) => sum + row.tokens_in, 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-secondary)] text-sm">Input Token Cost</p>
                <p className="text-2xl font-bold text-green-600">
                  ${estimation.totalUSD.toFixed(4)}
                </p>
              </div>
            </div>
            <p className="text-[var(--text-muted)] text-xs mt-2">
              * Input tokens only. Output token costs will be calculated after processing.
            </p>
          </div>

          {/* Per-row breakdown */}
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
            Row-by-Row Breakdown
          </h3>
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-4 pb-2 border-b border-[var(--border)] text-sm font-medium text-[var(--text-secondary)]">
              <div>Row</div>
              <div className="col-span-2">Prompt Preview</div>
              <div>Model</div>
              <div className="text-right">Input Tokens</div>
              <div className="text-right">Input Cost</div>
            </div>

            {rowDetails.map((row, index) => (
              <div
                key={row.id}
                className="grid grid-cols-6 gap-4 py-2 text-sm hover:bg-[var(--bg-secondary)] rounded"
              >
                <div className="text-[var(--text-primary)]">#{index + 1}</div>
                <div className="col-span-2 truncate text-[var(--text-secondary)]">
                  {row.prompt.substring(0, 50)}...
                  {row.hasSystem && <span className="text-blue-500 ml-1">[+sys]</span>}
                </div>
                <div className="text-[var(--text-secondary)] text-xs truncate">
                  {row.model.split('/').pop()}
                </div>
                <div className="text-right text-[var(--text-primary)]">
                  {row.tokens_in.toLocaleString()}
                </div>
                <div className="text-right text-green-600">${row.est_cost.toFixed(4)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-between items-center">
          <p className="text-[var(--text-muted)] text-sm">
            Total cost will include output tokens after processing
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
