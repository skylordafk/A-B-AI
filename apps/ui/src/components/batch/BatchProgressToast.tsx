import React from 'react';
import type { BatchProgress } from '../../types/batch';

interface BatchProgressToastProps {
  progress: BatchProgress;
}

export default function BatchProgressToast({ progress }: BatchProgressToastProps) {
  const formatETA = (seconds?: number) => {
    if (!seconds) return '';

    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-lg p-4 min-w-[280px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[var(--text-primary)] font-medium">Processing Batch</span>
        <span className="text-[var(--text-secondary)] text-sm">
          {progress.current} / {progress.total} ({progress.percentage}%)
        </span>
      </div>

      <div className="relative w-full h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {progress.eta !== undefined && (
        <div className="mt-2 text-[var(--text-muted)] text-sm text-right">
          ETA: {formatETA(progress.eta)}
        </div>
      )}
    </div>
  );
}
