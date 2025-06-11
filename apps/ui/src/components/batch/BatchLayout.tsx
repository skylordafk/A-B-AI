import React from 'react';

interface BatchLayoutProps {
  concurrency: number;
  onConcurrencyChange: (value: number) => void;
  onNavigateToChat: () => void;
  onOpenTemplateBrowser: () => void;
}

export default function BatchLayout({
  concurrency,
  onConcurrencyChange,
  onNavigateToChat,
  onOpenTemplateBrowser,
}: BatchLayoutProps) {
  return (
    <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Batch Prompting</h1>

          <div className="flex items-center gap-3">
            <label htmlFor="concurrency" className="text-[var(--text-secondary)] text-sm">
              Concurrency:
            </label>
            <input
              id="concurrency"
              type="range"
              min="1"
              max="10"
              value={concurrency}
              onChange={(e) => onConcurrencyChange(parseInt(e.target.value))}
              className="w-32"
            />
            <span className="text-[var(--text-primary)] text-sm font-medium w-8">
              {concurrency}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onOpenTemplateBrowser}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Browse Templates
          </button>

          <a
            href="/batch-template.csv"
            download="batch-template.csv"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Download basic template
          </a>
          <button
            onClick={onNavigateToChat}
            className="px-4 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors"
          >
            Back to Chat
          </button>
        </div>
      </div>
    </div>
  );
}
