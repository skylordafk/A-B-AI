import React from 'react';
import type { BatchResult } from '../../types/batch';

interface ResultsTableProps {
  results: BatchResult[];
}

export default function ResultsTable({ results }: ResultsTableProps) {
  const getStatusBadge = (status: BatchResult['status']) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';

    switch (status) {
      case 'success':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400`;
      case 'error':
      case 'error-api':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400`;
      case 'error-missing-key':
        return `${baseClasses} bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
    }
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                Prompt
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                Model
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                Tokens In
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                Tokens Out
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                Cost
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {results.map((result) => (
              <tr key={result.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                  <span title={result.prompt}>{truncateText(result.prompt)}</span>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{result.model}</td>
                <td className="px-4 py-3">
                  <span className={getStatusBadge(result.status)}>{result.status}</span>
                  {result.errorMessage && (
                    <span
                      className="ml-2 text-xs text-[var(--text-muted)]"
                      title={result.errorMessage}
                    >
                      {truncateText(result.errorMessage, 30)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)]">
                  {result.tokens_in || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)]">
                  {result.tokens_out || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)]">
                  {result.cost_usd !== undefined ? `$${result.cost_usd.toFixed(4)}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
